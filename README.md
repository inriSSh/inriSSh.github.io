# WorkBridge — Thai ↔ Myanmar Translation MVP

A simple web application prototype for:
- Thai ↔ Myanmar translation
- Browser speech recognition
- Text translation
- Conversation transcript
- Summary
- Task extraction
- WorkBridge-style UI

## Important

This version does NOT use Soniox, WebRTC, video calls, or a complicated meeting server.

The browser handles microphone speech recognition when supported. Translation is sent to a local LibreTranslate server. If LibreTranslate is unavailable, the UI uses a small demo fallback so the prototype can still be demonstrated.

## 1. Install

Python 3.10+ is recommended.

```bash
python -m venv .venv
```

macOS/Linux:

```bash
source .venv/bin/activate
```

Windows:

```bash
.venv\Scripts\activate
```

Then:

```bash
pip install -r requirements.txt
```

## 2. Run WorkBridge

```bash
python app.py
```

Open:

http://127.0.0.1:8000

## 3. Optional: run LibreTranslate locally

If Docker is installed, run LibreTranslate separately. Then set:

```bash
export LIBRETRANSLATE_URL=http://localhost:5000
```

Windows PowerShell:

```powershell
$env:LIBRETRANSLATE_URL="http://localhost:5000"
```

Then start WorkBridge.

If LibreTranslate is not running, the application still opens and the included demo phrases work.

## 4. Speech recognition

Speech recognition is provided by the browser's Web Speech API. Browser and language support can vary, especially for Myanmar. The text input remains available as a reliable fallback for the university demo.

## 5. What is intentionally simple

The summary/task endpoint is a deterministic MVP implementation rather than a paid LLM. It creates a short summary from recent translated messages and detects common task/request markers.

For the final project, this endpoint can later be replaced with a local or approved AI model without changing the UI.
