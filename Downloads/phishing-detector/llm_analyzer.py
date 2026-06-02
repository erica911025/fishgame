# -*- coding: utf-8 -*-
"""
llm_analyzer.py ── 分支 C（串接）＋ 分支 B（提示）
- analyze()：核心入口。有 OPENAI_API_KEY 就呼叫 GPT-4o-mini（JSON mode）；
  沒有金鑰則自動切換到「離線啟發式模式」，讓系統仍可端到端展示與測試。
- 內含 JSON 解析失敗重試、輸出欄位驗證與正規化、v4 信心值上限的事後保險。
"""
import json
import os

import config
import prompts
import preprocessing as pre

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass


def _get_api_key():
    """取得 OpenAI 金鑰：本機讀環境變數（.env），雲端讀 Streamlit secrets。"""
    key = os.getenv("OPENAI_API_KEY")
    if key:
        return key
    # Streamlit Community Cloud：從 st.secrets 取（本機未裝 streamlit 時略過）
    try:
        import streamlit as st
        if "OPENAI_API_KEY" in st.secrets:
            key = st.secrets["OPENAI_API_KEY"]
            os.environ["OPENAI_API_KEY"] = key   # 讓 openai SDK 也讀得到
            return key
    except Exception:
        pass
    return None


def _get_gemini_key():
    """取得 Gemini 金鑰（支援 GEMINI_API_KEY 與 GOOGLE_API_KEY 兩種命名）。"""
    for var in ("GEMINI_API_KEY", "GOOGLE_API_KEY"):
        v = os.getenv(var)
        if v:
            return v
    try:
        import streamlit as st
        for var in ("GEMINI_API_KEY", "GOOGLE_API_KEY"):
            if var in st.secrets:
                v = st.secrets[var]
                os.environ[var] = v
                return v
    except Exception:
        pass
    return None


def _resolve_provider():
    """依現有金鑰決定使用哪家供應商。
    回傳 (provider, api_key, model, base_url)；provider 為 "openai" / "gemini" / None。
    優先序：OpenAI > Gemini > 離線。
    """
    if _get_api_key():
        return ("openai", _get_api_key(), config.MODEL, None)
    if _get_gemini_key():
        return ("gemini", _get_gemini_key(), config.GEMINI_MODEL, config.GEMINI_BASE_URL)
    return (None, None, None, None)


def current_provider_label() -> str:
    """供 app.py 在 sidebar 顯示目前使用的模型。"""
    p, _, model, _ = _resolve_provider()
    if p == "openai":
        return f"🟢 線上 OpenAI（{model}）"
    if p == "gemini":
        return f"🟢 線上 Gemini（{model}，免費額度）"
    return "🟡 離線啟發式（未設定任何 API 金鑰）"


# ---------------------------------------------------------------------------
# 輸出正規化：確保 6 欄齊全、取值合法、confidence 落在 0~1
# ---------------------------------------------------------------------------
def normalize_output(obj: dict, flags: dict) -> dict:
    out = {
        "risk_level": "uncertain",
        "is_phishing": "uncertain",
        "suspicious_features": [],
        "explanation": "",
        "recommended_action": "",
        "confidence": 0.5,
    }
    if isinstance(obj, dict):
        out.update({k: obj.get(k, out[k]) for k in out})

    if out["risk_level"] not in config.RISK_LEVELS:
        out["risk_level"] = "medium"
    if out["is_phishing"] not in config.IS_PHISHING_VALUES:
        out["is_phishing"] = "uncertain"
    if not isinstance(out["suspicious_features"], list):
        out["suspicious_features"] = [str(out["suspicious_features"])]
    try:
        out["confidence"] = max(0.0, min(1.0, float(out["confidence"])))
    except (TypeError, ValueError):
        out["confidence"] = 0.5

    # v4 規則 7 的事後保險：有外部連結但無法驗證真偽時，信心值不超過上限
    if flags.get("urls") and flags.get("domain_mismatch"):
        out["confidence"] = min(out["confidence"],
                                config.CONFIDENCE_CEILING_WHEN_UNVERIFIABLE)

    # 注入企圖一定列為可疑特徵（防止模型漏列）
    if flags.get("injection_hits"):
        note = "訊息中夾帶試圖操控判斷的指令（提示注入），本身即為高度可疑訊號"
        if note not in out["suspicious_features"]:
            out["suspicious_features"].append(note)
        out["risk_level"] = "high"
        if out["is_phishing"] == "no":
            out["is_phishing"] = "yes"
    return out


def _parse_json(text: str):
    """容錯解析：去除可能的 Markdown 圍欄後解析。"""
    text = (text or "").strip()
    if text.startswith("```"):
        text = text.strip("`")
        text = text[text.find("{"):]
    start, end = text.find("{"), text.rfind("}")
    if start != -1 and end != -1:
        text = text[start:end + 1]
    return json.loads(text)


# ---------------------------------------------------------------------------
# 線上模式：呼叫 LLM（OpenAI 或 Gemini，依現有金鑰自動切換）
# ---------------------------------------------------------------------------
def _analyze_llm(message: str, flags: dict, retries: int = 2, platform: str = None) -> dict:
    from openai import OpenAI
    provider, api_key, model, base_url = _resolve_provider()
    if not provider:
        raise RuntimeError("沒有可用的 LLM 金鑰")

    # Gemini 走 OpenAI 相容端點，只需要換 base_url 與 model；其他完全一致。
    if provider == "gemini":
        client = OpenAI(api_key=api_key, base_url=base_url)
    else:
        client = OpenAI(api_key=api_key)

    messages = prompts.build_messages(message, pre.feature_hint_text(flags), platform=platform)

    # OpenAI 的 json_object 嚴格模式 Gemini 相容端點不一定支援；對 Gemini 略過，
    # 改靠 prompt 內已明確要求「只輸出 JSON」+ _parse_json 容錯解析。
    extra = {"response_format": {"type": "json_object"}} if provider == "openai" else {}

    last_err = None
    for _ in range(retries + 1):
        try:
            resp = client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=config.TEMPERATURE,
                max_tokens=config.MAX_TOKENS,
                **extra,
            )
            return normalize_output(_parse_json(resp.choices[0].message.content), flags)
        except Exception as e:
            last_err = e
    raise RuntimeError(f"{provider} 呼叫/解析多次失敗：{last_err}")


# ---------------------------------------------------------------------------
# 離線模式：啟發式判斷（無 API 金鑰時使用，邏輯對齊 v4 規則）
# ---------------------------------------------------------------------------
def _analyze_heuristic(message: str, flags: dict) -> dict:
    feats, score = [], 0
    if flags["asks_for_credentials"]:
        feats.append("要求提供帳號、密碼或個人敏感資料"); score += 2
    if flags["domain_mismatch"]:
        feats.append("連結網域與官方網域不符"); score += 2
    elif flags["urls"]:
        feats.append("訊息含外部連結")
    if pre.has_attachment(message):
        feats.append("要求下載或開啟附件檔"); score += 1
    if flags["urgency_level"] == "高":
        feats.append("使用急迫、限時或威脅語氣"); score += 1

    # v4 規則 6：語氣急但連結與身分皆合理 → 下修
    if flags["urgency_level"] == "高" and not flags["domain_mismatch"] \
            and not flags["asks_for_credentials"]:
        score = max(0, score - 1)

    if score >= 3:
        risk, is_ph, conf = "high", "yes", 0.8
    elif score >= 1:
        risk, is_ph, conf = "medium", "uncertain", 0.6
    else:
        risk, is_ph, conf = "low", "no", 0.8

    if risk == "high":
        action = "不要點擊連結、不要輸入帳密或提供個資。請改從官方網站或官方電話查證，並向學校資訊中心回報這則訊息。"
        expl = "這則訊息同時出現索取個資、可疑連結或限時施壓等強指標，符合常見釣魚/詐騙手法。"
    elif risk == "medium":
        action = "先暫停點擊連結或填表，改用官方管道（系辦、資訊中心、官網）確認訊息真實性後再決定。"
        expl = "這則訊息出現少數可疑特徵，但尚無法只憑文字確認真偽，建議先向官方查證。"
    else:
        action = "目前看起來沒有明顯危險特徵，無需特別處理；若仍有疑慮，可至官方網站確認。"
        expl = "訊息未要求帳密或個資、無可疑連結、語氣正常，與一般校園通知相符。"

    return normalize_output({
        "risk_level": risk, "is_phishing": is_ph,
        "suspicious_features": feats, "explanation": expl,
        "recommended_action": action, "confidence": conf,
    }, flags)


# ---------------------------------------------------------------------------
# 對外入口
# ---------------------------------------------------------------------------
def has_api_key() -> bool:
    """是否有任一可用線上金鑰（OpenAI 或 Gemini）。"""
    return _resolve_provider()[0] is not None


def analyze(message: str, use_mock: bool = None, platform: str = None) -> dict:
    """分析單一訊息，回傳 6 欄結構化結果。
    use_mock=None 時自動判斷（有任一線上金鑰用線上、皆無則用離線）。
    platform 可選（"Email"/"LINE"/"簡訊"/"學校平台"），用於 v4 平台適配。
    """
    cleaned = pre.clean_text(message)
    flags = pre.build_feature_flags(cleaned)
    if use_mock is None:
        use_mock = not has_api_key()
    if use_mock:
        result = _analyze_heuristic(cleaned, flags)
    else:
        try:
            result = _analyze_llm(cleaned, flags, platform=platform)
        except Exception as e:
            print(f"[llm_analyzer] 線上模式失敗，改用離線啟發式：{e}")
            result = _analyze_heuristic(cleaned, flags)
    result["_feature_flags"] = flags
    return result


if __name__ == "__main__":
    msg = ("【計算機中心緊急通知】您的校園帳號偵測到異常登入即將停用，"
           "請於今日23:59前點擊 http://campus-verify-tw.site/login 重新驗證身分。")
    print(json.dumps(analyze(msg, use_mock=True), ensure_ascii=False, indent=2))
