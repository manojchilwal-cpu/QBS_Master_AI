# Automaton Dashboard — Step 01: Intake Engine

> **"Understand input + create Project Card"**
> LLM reads all client materials (PDF, DOCX, audio) and outputs a structured JSON Project Card.

---

## Project Structure

```
automaton-dashboard/
├── static/
│   └── index.html       ← Dashboard UI (open this in browser)
├── server.py            ← FastAPI backend (Python)
├── requirements.txt     ← Python dependencies
└── README.md
```

---

## Quick Start

### 1. Set your OpenAI API key

```bash
export OPENAI_API_KEY=sk-your-key-here
```

Or create a `.env` file (and load it with `python-dotenv` if you prefer).

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Run the backend server

```bash
python server.py
```

You'll see:
```
🚀  Automaton Intake Engine
   Dashboard → http://localhost:8000
   API docs  → http://localhost:8000/docs
```

### 4. Open the dashboard

Open your browser at **http://localhost:8000**

---

## How it works

```
User uploads files + pastes brief
          ↓
   server.py receives the request
          ↓
   Extracts text:
   - PDF   → pdfplumber
   - DOCX  → python-docx
   - Audio → OpenAI Whisper API
   - TXT   → raw read
          ↓
   Builds a prompt with all content
          ↓
   Calls ChatGPT API (gpt-4o)
          ↓
   Parses JSON response
          ↓
   Returns Project Card to dashboard
          ↓
   Dashboard renders card + Export JSON button
```

---

## API Endpoints

| Method | Path             | Description                                  |
|--------|------------------|----------------------------------------------|
| GET    | `/`              | Serves the dashboard HTML                    |
| POST   | `/api/intake`    | Full intake: multipart upload + brief text   |
| POST   | `/api/intake-json` | Lightweight: brief text only (no files)    |
| GET    | `/health`        | Health check, shows model + key status       |
| GET    | `/docs`          | Auto-generated Swagger API docs              |

---

## Project Card Output Format

```json
{
  "project_name": "Brand Explainer Video",
  "objective": "Produce a 90-second 2D animated explainer for product launch",
  "project_type": "2D Animation",
  "brand_notes": "Primary color #2D6CDF, Montserrat font, minimal style",
  "deliverables": ["Final MP4", "Source AEP file", "Thumbnail"],
  "risks": ["No audio script provided", "Deadline not specified"],
  "timeline_hint": "End of Q2 2026",
  "priority": "High"
}
```

---

## Roadmap

| Step | Description                    | Status      |
|------|--------------------------------|-------------|
| 01   | Intake Engine                  | ✅ This file |
| 02   | Script Standardization         | 🔜 Next      |
| 03   | Technical Needs Mapping        | 🔜 Coming    |
| 04   | AI API Execution Layer         | 🔜 Coming    |
| 05   | Review & Version Control       | 🔜 Coming    |

---

## Model Configuration

Edit the top of `server.py` to change models:

```python
MODEL      = "gpt-4o"          # or "gpt-3.5-turbo" for lower cost
MAX_TOKENS = 1000
```

---

## Troubleshooting

**"OPENAI_API_KEY is not set"**
→ Run `export OPENAI_API_KEY=sk-...` before starting the server.

**Dashboard shows "Could not connect"**
→ Make sure `python server.py` is running and open http://localhost:8000.

**PDF shows no text**
→ The PDF may be scanned/image-based. Use an OCR tool first or enable `pypdf` fallback.

**Audio not transcribing**
→ Ensure your OpenAI key has Whisper access. MP3, WAV, M4A supported.
