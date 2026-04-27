"""
Automaton — Step 01: Intake Engine Backend
==========================================
FastAPI server using Anthropic Claude API (no OpenAI needed).

Install dependencies:
  pip install -r requirements.txt

Run:
  1. Set your Anthropic API key:
     Windows CMD : set ANTHROPIC_API_KEY=sk-ant-...
     Mac/Linux   : export ANTHROPIC_API_KEY=sk-ant-...

  2. python server.py
     → Dashboard at http://localhost:8000
"""

import os
import json
import re
import tempfile
import traceback
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

_env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=_env_path, override=True)

import anthropic
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel

# ─── Config ──────────────────────────────────────────────────────────────────

MODEL      = "claude-haiku-4-5-20251001"
MAX_TOKENS = 1000

# ─── App Setup ───────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(_app):
    load_dotenv(dotenv_path=_env_path, override=True)
    yield

app = FastAPI(title="Automaton Intake Engine", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

static_dir = Path(__file__).parent / "static"
if static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

# ─── File Parsers ─────────────────────────────────────────────────────────────

def extract_text_from_pdf(path: str) -> str:
    try:
        import pdfplumber
        text = []
        with pdfplumber.open(path) as pdf:
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    text.append(t)
        return "\n".join(text)
    except ImportError:
        return "[pdfplumber not installed — run: pip install pdfplumber]"
    except Exception as e:
        return f"[PDF parse error: {e}]"


def extract_text_from_docx(path: str) -> str:
    try:
        from docx import Document
        doc = Document(path)
        return "\n".join(p.text for p in doc.paragraphs if p.text.strip())
    except ImportError:
        return "[python-docx not installed — run: pip install python-docx]"
    except Exception as e:
        return f"[DOCX parse error: {e}]"


def extract_content(file: UploadFile) -> str:
    suffix   = Path(file.filename).suffix.lower()
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(file.file.read())
            tmp_path = tmp.name

        if suffix == ".pdf":
            return extract_text_from_pdf(tmp_path)
        elif suffix in (".docx", ".doc"):
            return extract_text_from_docx(tmp_path)
        elif suffix == ".txt":
            return Path(tmp_path).read_text(encoding="utf-8", errors="ignore")
        else:
            return f"[Unsupported file type: {suffix}]"
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)

# ─── Claude API Call ──────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are an LLM Intake Engine for a professional design and animation production studio.
Your job is to read all client-provided materials and extract a clean structured Project Card.
Always return ONLY valid JSON — no markdown fences, no preamble, no explanation whatsoever.
"""

PROJECT_CARD_SCHEMA = {
    "project_name":  "short descriptive name (inferred if not stated)",
    "objective":     "one sentence — the single core deliverable goal",
    "project_type":  "one of: 2D Animation | Motion Graphics | Whiteboard | Slideshow | Unknown",
    "brand_notes":   "any brand colors, fonts, visual identity, or style guidelines mentioned",
    "deliverables":  ["array of expected output files or assets"],
    "risks":         ["missing info, ambiguities, or concerns"],
    "timeline_hint": "deadline or duration if mentioned, else Not specified",
    "priority":      "High | Medium | Low (infer from urgency language)"
}


def build_prompt(brief: str, file_contents: dict) -> str:
    parts = ["Analyze the following project materials and return a Project Card JSON.\n"]

    if file_contents:
        parts.append("=== UPLOADED FILE CONTENTS ===")
        for name, content in file_contents.items():
            parts.append(f"\n--- {name} ---\n{content[:4000]}")

    if brief.strip():
        parts.append(f"\n=== CLIENT BRIEF / SOW NOTES ===\n{brief}")

    parts.append(f"\n=== REQUIRED JSON STRUCTURE ===\n{json.dumps(PROJECT_CARD_SCHEMA, indent=2)}")
    return "\n".join(parts)


def _get_api_key() -> str:
    key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not key and _env_path.exists():
        for line in _env_path.read_text(encoding="utf-8").splitlines():
            if line.strip().startswith("ANTHROPIC_API_KEY"):
                key = line.split("=", 1)[-1].strip()
                break
    return key


def call_claude(brief: str, file_contents: dict) -> dict:
    key = _get_api_key()
    if not key:
        raise ValueError(
            "ANTHROPIC_API_KEY is not set.\n"
            "Add it to your .env file:\n"
            "  ANTHROPIC_API_KEY=sk-ant-..."
        )

    print(f"[intake] calling Claude model={MODEL}, key=...{key[-6:]}")

    client  = anthropic.Anthropic(api_key=key)
    message = client.messages.create(
        model      = MODEL,
        max_tokens = MAX_TOKENS,
        system     = SYSTEM_PROMPT,
        messages   = [{"role": "user", "content": build_prompt(brief, file_contents)}]
    )

    raw = message.content[0].text
    print(f"[intake] raw response: {raw[:200]}")
    raw = re.sub(r"```(?:json)?", "", raw).strip()
    return json.loads(raw)

# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/")
def serve_index():
    index = static_dir / "index.html"
    if index.exists():
        return FileResponse(str(index))
    return JSONResponse({"message": "Automaton Intake Engine", "status": "running"})


@app.post("/api/intake")
async def intake(
    files: list[UploadFile] = File(default=[]),
    brief: str              = Form(default=""),
):
    try:
        file_contents = {}
        for f in files:
            if f.filename:
                file_contents[f.filename] = extract_content(f)

        project_card = call_claude(brief, file_contents)
        return JSONResponse({"project_card": project_card, "status": "ok"})

    except json.JSONDecodeError as e:
        return JSONResponse(status_code=422, content={"error": "Claude returned non-JSON", "detail": str(e)})
    except ValueError as e:
        return JSONResponse(status_code=400, content={"error": str(e)})
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})


class IntakeJSON(BaseModel):
    files:  Optional[str] = ""
    brief:  Optional[str] = ""
    prompt: Optional[str] = ""


@app.post("/api/intake-json")
async def intake_json(body: IntakeJSON):
    try:
        project_card = call_claude(body.brief or "", {})
        return JSONResponse({"project_card": project_card, "status": "ok"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


# ─── Step 02: Classification Engine ──────────────────────────────────────────

CLASSIFY_SYSTEM_PROMPT = """You are the Classification Engine for a professional design and animation production studio.
Your job is to analyse an intake Project Card and produce a structured workflow breakdown.
Always return ONLY valid JSON — no markdown fences, no preamble, no explanation whatsoever.
"""

CLASSIFY_SCHEMA = {
    "project_type": "confirmed: 2D Animation | Motion Graphics | Whiteboard | Slideshow",
    "backbone": {
        "asset_prep": ["array of common asset-prep items (naming, folder structure, resolution)"],
        "logic":      ["array of common logic items (scene-by-scene script breakdown)"],
        "review":     ["array of common review items (timestamped feedback loops, version control)"]
    },
    "type_variables": {
        "asset_prep": "format/structure specific to the confirmed project_type",
        "logic":      "timing, sequencing, or path logic specific to the project_type",
        "review":     "review focus area specific to the project_type"
    },
    "phases": {
        "A_visual_storyboard": {
            "title": "Visual Storyboard (Conceptualization)",
            "tasks": ["array of 3–5 concrete tasks for this specific project"],
            "ai_integration": "one sentence: exact Claude API use-case for this phase"
        },
        "B_artwork_structure": {
            "title": "Artwork Structure (Technical Drafting)",
            "tasks": ["array of 3–5 concrete tasks"],
            "ai_integration": "one sentence: exact Claude API use-case for this phase"
        },
        "C_animation_setup": {
            "title": "Animation Setup (Technical Execution)",
            "tasks": ["array of 3–5 concrete tasks"],
            "ai_integration": "one sentence: exact Claude API use-case for this phase"
        }
    }
}


def call_claude_classify(project_card: dict) -> dict:
    key = _get_api_key()
    if not key:
        raise ValueError("ANTHROPIC_API_KEY is not set. Add it to your .env file.")

    prompt = (
        "Analyse the following Project Card and return a Step 02 Workflow Classification.\n\n"
        f"=== PROJECT CARD ===\n{json.dumps(project_card, indent=2)}\n\n"
        f"=== REQUIRED JSON STRUCTURE ===\n{json.dumps(CLASSIFY_SCHEMA, indent=2)}\n\n"
        "Rules:\n"
        "- backbone items = common to ALL projects regardless of type\n"
        "- type_variables = specific to the confirmed project_type\n"
        "- phase tasks = concrete and actionable for THIS project\n"
        "- ai_integration = precise description of how Claude API helps in each phase"
    )

    print(f"[classify] calling Claude model={MODEL}")
    client  = anthropic.Anthropic(api_key=key)
    message = client.messages.create(
        model      = MODEL,
        max_tokens = 1500,
        system     = CLASSIFY_SYSTEM_PROMPT,
        messages   = [{"role": "user", "content": prompt}]
    )
    raw = message.content[0].text
    print(f"[classify] raw response: {raw[:200]}")
    raw = re.sub(r"```(?:json)?", "", raw).strip()
    return json.loads(raw)


class ClassifyRequest(BaseModel):
    project_card: dict


@app.post("/api/classify")
async def classify(body: ClassifyRequest):
    try:
        workflow = call_claude_classify(body.project_card)
        return JSONResponse({"workflow": workflow, "status": "ok"})
    except json.JSONDecodeError as e:
        return JSONResponse(status_code=422, content={"error": "Claude returned non-JSON", "detail": str(e)})
    except ValueError as e:
        return JSONResponse(status_code=400, content={"error": str(e)})
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL, "api_key_set": bool(_get_api_key())}


# ─── Run ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    print("\n[*] Automaton Intake Engine")
    print("   Dashboard -> http://localhost:8000")
    print("   API docs  -> http://localhost:8000/docs\n")
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)