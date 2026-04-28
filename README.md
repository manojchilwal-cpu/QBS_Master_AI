# LLM Design — AI-Powered Design & Animation Pipeline

An AI platform for managing design and animation projects. It combines a React/Node.js dashboard with a Python AI backend to automate project intake, context generation, and workflow classification using large language models.

---

## Repository Structure

```
Demmo/
├── Project-Animation-AI/
│   ├── login-app/                      ← Main web application
│   │   ├── src/
│   │   │   ├── App.jsx                 ← Root component (auth, projects, setup)
│   │   │   ├── App.css                 ← Global styles + theming
│   │   │   ├── AutomatonDashboard.jsx  ← AI workflow dashboard
│   │   │   ├── AutomatonDashboard.css
│   │   │   ├── main.jsx
│   │   │   └── icons/                  ← SVG icon components
│   │   ├── server/
│   │   │   ├── index.js                ← Express API + SQLite backend
│   │   │   ├── llmdesign.db            ← SQLite database (auto-created)
│   │   │   └── uploads/                ← Uploaded brief files
│   │   ├── dist/                       ← Production build output
│   │   └── package.json
│   └── Icon-Set/                       ← SVG design icon library
├── automaton-dashboard/
│   ├── server.py                       ← FastAPI AI backend (Python)
│   ├── requirements.txt
│   └── static/
│       └── index.html
├── AI_Pipeline_Updated.pptx            ← Project presentation
└── README.md
```

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 18.3 | UI framework |
| Vite | 5.4 | Build tool & dev server |
| CSS Custom Properties | — | Dark / light theming |

### Backend — Node.js
| Technology | Version | Purpose |
|---|---|---|
| Express | 4.18 | REST API server |
| better-sqlite3 | 12.9 | SQLite database (persistent storage) |
| multer | 2.1 | File upload handling |
| jsonwebtoken | 9.0 | JWT authentication |
| bcryptjs | 2.4 | Password hashing |

### Backend — Python / AI
| Technology | Version | Purpose |
|---|---|---|
| FastAPI | 0.110+ | AI API server |
| Anthropic Claude | Latest | Project intake & classification |
| pdfplumber | 0.10+ | PDF text extraction |
| python-docx | 1.1+ | DOCX text extraction |
| uvicorn | 0.29+ | ASGI server |

---

## Features

### Authentication
- JWT-based login with bcrypt password hashing
- "Remember me" — saves username to localStorage
- Auto session restore on page reload
- Demo credentials: `admin` / `Demo1234!`

---

### Project Dashboard
- Create, edit, and delete projects
- Grid view and list view toggle
- Project types: 2D Animation, Motion Graphics, Whiteboard Animation, Slideshow, Branding, UI/UX, Web App
- Access levels: Admin, Editor, Reviewer, Designer, Developer
- All projects persisted to SQLite — survive page refresh and server restart

---

### Project Setup — 3-Step Workflow

Each project goes through a structured setup pipeline:

**Step 1 — Project Context**
- Upload a brief file (`.docx`, `.pdf`, `.txt`, `.odt`, `.xlsx`, `.pptx`)
- OR type your brief directly in the Draft Context textarea
- Click **Generate from Brief** → populates Objective, Design Spec, and Technical Spec blocks
- Brief is saved to the database and shown in the **Saved Briefs** panel
- Click **Use** on any saved brief to reload it into all spec blocks (button shows **Applied ✓** for 2 seconds)
- Click **Save** to persist the filled context to the database

**Step 2 — Design Language Consistency**
- Refine design specifications
- AI classification drives the workflow breakdown

**Step 3 — Multimodal Categorisation**
- Technical workflow breakdown displayed
- Export-ready project structure

---

### Saved Briefs

- Every brief (typed or uploaded) is stored per project in SQLite
- Listed in the left panel with **FILE** or **TEXT** badge
- **Use** — loads brief content into all three spec blocks; right column auto-scrolls to Objective
- **×** — permanently deletes brief from database
- Briefs reload automatically when you reopen a project

---

### Automaton Dashboard (Animation Projects)

Triggered automatically when creating a **2D Animation** or **Motion Graphics** project:

| Step | Action | API Called |
|---|---|---|
| 1 — Project Context | Upload files + write objective → AI intake | `POST /api/intake` (Python :8000) |
| 2 — Design Language | Reviews intake result → classification | `POST /api/classify` (Python :8000) |
| 3 — Multimodal | Technical phases displayed | — |

- Step progress tracked with numbered stepper (active step highlighted in red)
- **Next** advances step and triggers the AI call
- **Save** stores current state with confirmation message
- **Skip** returns to the project list

---

### Dark / Light Theme
- Toggle via button (bottom-right corner)
- Preference saved to localStorage and restored on next visit

---

## Database Schema

SQLite database is auto-created at `server/llmdesign.db` on first run.

### `projects`
| Column | Type | Description |
|---|---|---|
| `id` | TEXT (PK) | Unique project ID (timestamp) |
| `name` | TEXT | Project name |
| `type` | TEXT | Project type |
| `description` | TEXT | Subtitle / notes |
| `access` | TEXT | Access level |
| `size_kb` | REAL | Simulated file size |
| `created_at` | TEXT | ISO datetime |
| `updated_at` | TEXT | ISO datetime |

### `project_context`
| Column | Type | Description |
|---|---|---|
| `project_id` | TEXT (PK, FK) | Links to projects |
| `objective` | TEXT | Project objective |
| `design_spec` | TEXT | Design specification |
| `technical_spec` | TEXT | Technical specification |
| `updated_at` | TEXT | Last saved time |

### `briefs`
| Column | Type | Description |
|---|---|---|
| `id` | INTEGER (PK) | Auto-increment |
| `project_id` | TEXT (FK) | Links to projects |
| `content` | TEXT | Full brief text |
| `source` | TEXT | `text`, `file`, or `file-binary` |
| `filename` | TEXT | Original filename if uploaded |
| `created_at` | TEXT | ISO datetime |

> Deleting a project cascades — all its context and briefs are removed automatically.

---

## API Reference

### Auth
| Method | Endpoint | Body | Response |
|---|---|---|---|
| POST | `/api/login` | `{ username, password }` | `{ user, token }` |

### Projects
| Method | Endpoint | Body | Description |
|---|---|---|---|
| GET | `/api/projects` | — | List all projects |
| POST | `/api/projects` | `{ id, name, type, description, access, sizeKB }` | Create project |
| PUT | `/api/projects/:id` | `{ name, type, description, access, sizeKB }` | Update project |
| DELETE | `/api/projects/:id` | — | Delete project (cascades) |

### Project Context
| Method | Endpoint | Body | Description |
|---|---|---|---|
| GET | `/api/projects/:id/context` | — | Load saved spec blocks |
| POST | `/api/projects/:id/context` | `{ objective, design_spec, technical_spec }` | Save spec blocks |

### Briefs
| Method | Endpoint | Body | Description |
|---|---|---|---|
| GET | `/api/projects/:id/briefs` | — | List all briefs for project |
| POST | `/api/projects/:id/briefs` | `{ content, source, filename }` | Save text brief |
| POST | `/api/projects/:id/briefs/upload` | `multipart/form-data` (file) | Upload file brief |
| DELETE | `/api/briefs/:id` | — | Delete brief |

### Python AI Backend (port 8000)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/intake` | Files + brief text → Project Card JSON |
| POST | `/api/classify` | Project Card → Workflow phase breakdown |
| GET | `/health` | Health check |
| GET | `/docs` | Swagger UI |

---

## Getting Started

### Prerequisites
- Node.js v18+
- Python 3.10+
- npm

---

### 1. Clone the repository

```bash
git clone https://github.com/manojchilwal-cpu/QBS_Master_AI.git
cd QBS_Master_AI
```

---

### 2. Install Node.js dependencies

```bash
cd Project-Animation-AI/login-app
npm install
```

---

### 3. Start the Express API server

```bash
npm run server
# → http://localhost:4000
# SQLite database created automatically at server/llmdesign.db
```

---

### 4. Start the React frontend

**Development (hot reload):**
```bash
npm run dev
# → http://localhost:5173
```

**Production build + preview:**
```bash
npm run build
npx vite preview
# → http://localhost:4173
```

---

### 5. Start the Python AI backend

```bash
cd automaton-dashboard

# Install Python dependencies
pip install -r requirements.txt

# Set your Anthropic API key
# Windows CMD:
set ANTHROPIC_API_KEY=sk-ant-...

# Mac / Linux:
export ANTHROPIC_API_KEY=sk-ant-...

# Start the server
python server.py
# → http://localhost:8000
# → API docs at http://localhost:8000/docs
```

> The Python backend is only required for animation project AI features. The dashboard, SQLite storage, and brief management work without it.

---

### 6. Login

Open the app and log in with the demo account:

| Username | Password |
|---|---|
| `admin` | `Demo1234!` |

---

## Running All Three Services

Open three terminal windows:

```bash
# Terminal 1 — Express API + SQLite (port 4000)
cd Project-Animation-AI/login-app
npm run server

# Terminal 2 — React frontend (port 5173)
cd Project-Animation-AI/login-app
npm run dev

# Terminal 3 — Python AI backend (port 8000)
cd automaton-dashboard
python server.py
```

---

## AI Pipeline Flow

```
User uploads files or types brief
            ↓
  Express saves brief to SQLite (briefs table)
            ↓
  [Animation project] → Python FastAPI (port 8000)
            ↓
  Text extraction:
    .txt   → Node.js fs.readFileSync
    .pdf   → pdfplumber
    .docx  → python-docx
    audio  → Whisper transcription
    other  → filename reference stored
            ↓
  Claude AI → Project Card JSON
            ↓
  Step 2: Claude classifies workflow phases
            ↓
  Objective / Design / Technical blocks populated in UI
            ↓
  User reviews, edits, and saves to SQLite (project_context table)
```

---

## Project Card — AI Output Format

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

## File Upload Support

| Format | Extraction Method | Storage |
|---|---|---|
| `.txt` | Full text (Node.js) | Content in `briefs.content` |
| `.pdf` | pdfplumber (Python) | Content in `briefs.content` |
| `.docx` | python-docx (Python) | Content in `briefs.content` |
| `.odt`, `.xlsx`, `.pptx` | Filename reference | Filename in `briefs.filename` |
| `.mp3`, `.wav` | Whisper transcription (Python) | Transcript in `briefs.content` |

---

## Troubleshooting

**Port already in use**
```bash
npx kill-port 4000   # Express API
npx kill-port 5173   # Vite dev server
npx kill-port 4173   # Vite preview
npx kill-port 8000   # Python server
```

**Reset the database**
Delete `Project-Animation-AI/login-app/server/llmdesign.db` and restart the Express server. The schema is recreated automatically.

**`ANTHROPIC_API_KEY` not set**
```bash
# Windows CMD
set ANTHROPIC_API_KEY=sk-ant-...

# Mac / Linux
export ANTHROPIC_API_KEY=sk-ant-...
```

**PDF shows no text**
The PDF may be image-based (scanned). Run it through an OCR tool first, or enable the `pypdf` fallback in `requirements.txt`.

**Vite preview can't reach the API**
Make sure `npm run server` is running on port 4000 before opening the preview URL.

**Use button on saved briefs not working**
Ensure the Express server is running and the project was opened after the server started so briefs are loaded from the database.

---

## Roadmap

| Step | Feature | Status |
|---|---|---|
| 01 | Login + JWT Auth | Done |
| 02 | Project Dashboard (CRUD) | Done |
| 03 | Dark / Light Theme | Done |
| 04 | SQLite Persistence | Done |
| 05 | Brief Upload + Storage | Done |
| 06 | Saved Briefs Panel + Use | Done |
| 07 | AI Intake Engine | Done |
| 08 | Workflow Classification | Done |
| 09 | Design Language Step | In Progress |
| 10 | Multimodal Categorisation | In Progress |
| 11 | Export / Download | Coming |
| 12 | Multi-user Auth | Coming |

---

## GitHub

[https://github.com/manojchilwal-cpu/QBS_Master_AI](https://github.com/manojchilwal-cpu/QBS_Master_AI)
