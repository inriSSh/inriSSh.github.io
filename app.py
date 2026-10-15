from flask import Flask, request, jsonify, send_from_directory
import os
import requests

app = Flask(__name__, static_folder="static")

LIBRETRANSLATE_URL = os.getenv("LIBRETRANSLATE_URL", "http://localhost:5000")

@app.get("/")
def index():
    return send_from_directory("static", "index.html")

@app.post("/api/translate")
def translate():
    data = request.get_json(force=True)
    text = (data.get("text") or "").strip()
    source = data.get("source", "auto")
    target = data.get("target", "th")

    if not text:
        return jsonify({"translatedText": ""})

    # The frontend can still work in Demo Mode when LibreTranslate is unavailable.
    try:
        r = requests.post(
            f"{LIBRETRANSLATE_URL}/translate",
            json={
                "q": text,
                "source": source,
                "target": target,
                "format": "text"
            },
            timeout=15,
        )
        r.raise_for_status()
        result = r.json()
        return jsonify({"translatedText": result.get("translatedText", "")})
    except Exception as e:
        return jsonify({
            "error": "Translation server unavailable",
            "details": str(e)
        }), 503

@app.post("/api/summarize")
def summarize():
    data = request.get_json(force=True)
    messages = data.get("messages", [])

    texts = []
    tasks = []

    for m in messages:
        original = (m.get("original") or "").strip()
        translated = (m.get("translated") or "").strip()
        if original or translated:
            texts.append(translated or original)

        # Simple, deterministic task extraction for the MVP.
        joined = f"{original} {translated}".lower()
        task_markers = [
            "need to", "should", "please", "i will", "we will",
            "ต้อง", "ควร", "ช่วย", "ฉันจะ", "เราจะ"
        ]
        if any(marker in joined for marker in task_markers):
            tasks.append({
                "task": translated or original,
                "assignee": m.get("speaker", "Unassigned")
            })

    summary = " ".join(texts[-8:])
    if len(summary) > 500:
        summary = summary[:500].rsplit(" ", 1)[0] + "..."

    return jsonify({
        "summary": summary or "No conversation has been recorded yet.",
        "tasks": tasks[:8]
    })

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8000, debug=True)
