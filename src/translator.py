from __future__ import annotations
from typing import Tuple
import os, json, re


#LLM client 
try:
    from ollama import Client
except Exception:
    Client = None  # type: ignore

def _ask_llm(prompt: str) -> str:
    """Single LLM call; returns '' on any error so tests don’t need Ollama."""
    try:
        if not Client:
            return ""
        host  = os.getenv("OLLAMA_HOST", "http://localhost:11434")
        model = os.getenv("TRANSLATOR_MODEL", "llama3.1:8b")
        resp = Client(host=host).chat(model=model, messages=[{"role": "user", "content": prompt}])
        return (resp.message.content or "").strip()
    except Exception:
        return ""

_JSON_PROMPT = (
    'You are a translator and language identifier.\n'
    'Return ONLY JSON exactly like: {"is_english": true|false, "translated_content": "<string>"}\n'
    '- If input is English: is_english=true and translated_content equals the original input.\n'
    '- If input is not English: is_english=false and translated_content is the English translation.\n'
    'No extra text, no code fences.\n\nInput: '
)
_TRANSLATE_ONLY = (
    "Translate the following text into natural English.\n"
    "Only output the translation, no explanations, no code fences:\n\n"
)

def _strip_fences(s: str) -> str:
    s = s.strip()
    if s.startswith("```"):
        s = re.sub(r"^```(?:json)?\s*|\s*```$", "", s, flags=re.I | re.S).strip()
    return s

def _first_json(s: str) -> str | None:
    m = re.search(r"\{.*\}", s, flags=re.S)
    return m.group(0) if m else None

def _looks_non_english(text: str) -> bool:
    return any(ord(ch) > 127 for ch in text)

def translate(content: str) -> Tuple[bool, str]:
    """
    Checkpoint behavior:
      - DEMO_MODE=1 (default): return hardcoded translation (proves UI wiring).
      - DEMO_MODE=0: use LLM JSON path with robust fallbacks.
    Returns (is_english, translated-if-non-english-else-original).
    """
    text = content or ""
    if not text.strip():
        return True, ""

    # hardcoded DEMO MODE
    if os.getenv("DEMO_MODE", "1") == "1":
        if _looks_non_english(text):
            return False, "This is a demo translation"
        return True, text

    # LLM MODE 
    raw = _ask_llm(_JSON_PROMPT + text)
    if raw:
        try:
            raw = _strip_fences(raw)
            blob = _first_json(raw) or raw
            data = json.loads(blob)
            is_en = bool(data.get("is_english", True))
            out = data.get("translated_content", "")
            out = out if isinstance(out, str) else ""
            return (True, text) if is_en else (False, out.strip() or text)
        except Exception:
            pass

    if _looks_non_english(text):
        out = _strip_fences(_ask_llm(_TRANSLATE_ONLY + text))
        return (False, out.strip() or text) if out else (True, text)

    return True, text



