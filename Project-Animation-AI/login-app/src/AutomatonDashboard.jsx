import { useRef, useState } from 'react';
import './AutomatonDashboard.css';

const ANIMATION_TYPES = ['2D Animation', 'Motion Graphics', 'Whiteboard Animation', 'Slideshow'];

function getFileBadge(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  if (ext === 'pdf') return { cls: 'badge-pdf', lbl: 'PDF' };
  if (['mp3', 'wav'].includes(ext)) return { cls: 'badge-audio', lbl: 'AUD' };
  return { cls: 'badge-doc', lbl: 'DOC' };
}

function getFileSize(file) {
  if (file.size < 1024 * 1024) return Math.round(file.size / 1024) + ' KB';
  return (file.size / 1024 / 1024).toFixed(1) + ' MB';
}

function AutomatonDashboard({ project, onBack }) {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [briefText, setBriefText] = useState('');
  const [loading, setLoading] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [workflowData, setWorkflowData] = useState(null);
  const [error, setError] = useState('');
  const [classifyError, setClassifyError] = useState('');
  const [processedTime, setProcessedTime] = useState('');
  const step2Ref = useRef(null);
  const fileInputRef = useRef(null);

  const handleFiles = (files) => {
    const incoming = Array.from(files);
    setUploadedFiles((prev) => {
      const filtered = incoming.filter((f) => !prev.find((x) => x.name === f.name));
      return [...prev, ...filtered];
    });
  };

  const removeFile = (index) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const runIntake = async () => {
    const brief = briefText.trim();
    if (uploadedFiles.length === 0 && !brief) return;

    setLoading(true);
    setError('');
    setLastResult(null);
    setWorkflowData(null);

    try {
      const formData = new FormData();
      formData.append('brief', brief);
      uploadedFiles.forEach((f) => formData.append('files', f));

      const res = await fetch('http://localhost:8000/api/intake', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setLastResult(data.project_card);
      setProcessedTime(new Date().toLocaleTimeString());
      setTimeout(() => {
        step2Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const runClassify = async () => {
    if (!lastResult) return;
    setClassifying(true);
    setClassifyError('');

    try {
      const res = await fetch('http://localhost:8000/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_card: lastResult })
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setWorkflowData(data.workflow);
    } catch (err) {
      setClassifyError(err.message);
    } finally {
      setClassifying(false);
    }
  };

  const exportJSON = () => {
    if (!lastResult) return;
    const blob = new Blob([JSON.stringify(lastResult, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project-card-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const step1Done  = !!lastResult;
  const step2Ready = !!lastResult;
  const step2Done  = !!workflowData;

  return (
    <div className="automaton-shell">

      {/* TOP BAR */}
      <nav className="automaton-topbar">
        <button className="automaton-back-btn" type="button" onClick={onBack}>
          ← Back to projects
        </button>
        <div className="automaton-logo">Automaton</div>
        <div className="automaton-step-nav">
          <span className={`automaton-step-pill ${step1Done ? 'done' : 'active'}`}>01 Intake</span>
          <span className={`automaton-step-pill ${!step2Ready ? 'locked' : step2Done ? 'done' : 'available'}`}>02 Classify</span>
          <span className="automaton-step-pill locked">03 Plan</span>
          <span className="automaton-step-pill locked">04 Execute</span>
        </div>
        <div className="automaton-version-tag">v0.1.0</div>
      </nav>

      {/* PROJECT CONTEXT */}
      {project && (
        <div className="automaton-project-context">
          <span className="automaton-context-label">Project</span>
          <strong className="automaton-context-name">{project.name}</strong>
          <span className="automaton-context-type">{project.type}</span>
        </div>
      )}

      {/* MAIN TWO-COLUMN GRID */}
      <main className="automaton-main">

        {/* LEFT: INPUT PANEL */}
        <div className="automaton-panel">
          <div className="automaton-panel-header">
            <div className="automaton-panel-step">Step 01 — Intake Engine</div>
            <div className="automaton-panel-title">Upload Client Materials</div>
            <div className="automaton-panel-sub">
              Upload SOW, references, audio briefs. The AI reads all inputs and outputs a Project Card.
            </div>
          </div>

          <div className="automaton-divider" />

          <div
            className="automaton-drop-zone"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }}
            onDragLeave={(e) => e.currentTarget.classList.remove('drag-over')}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove('drag-over');
              handleFiles(e.dataTransfer.files);
            }}
          >
            <div className="automaton-drop-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <div className="automaton-drop-title">Drop files here</div>
            <div className="automaton-drop-sub">PDF · DOCX · MP3 · WAV · TXT</div>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            multiple
            accept=".pdf,.mp3,.wav,.docx,.doc,.txt"
            onChange={(e) => handleFiles(e.target.files)}
          />

          {uploadedFiles.length > 0 && (
            <div className="automaton-file-list">
              {uploadedFiles.map((f, i) => {
                const { cls, lbl } = getFileBadge(f.name);
                return (
                  <div key={i} className="automaton-file-item">
                    <span className={`automaton-file-badge ${cls}`}>{lbl}</span>
                    <span className="automaton-file-name">{f.name}</span>
                    <span className="automaton-file-size">{getFileSize(f)}</span>
                    <button
                      type="button"
                      className="automaton-file-remove"
                      onClick={() => removeFile(i)}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="automaton-divider" />

          <div>
            <div className="automaton-field-label">Client brief / SOW notes</div>
            <textarea
              className="automaton-textarea"
              rows={6}
              value={briefText}
              onChange={(e) => setBriefText(e.target.value)}
              placeholder="Paste the statement of work, project description, deadlines, brand guidelines, or any raw client notes here..."
            />
          </div>

          <button
            type="button"
            className="automaton-run-btn"
            onClick={runIntake}
            disabled={loading}
          >
            {loading && <span className="automaton-spinner" />}
            <span>{loading ? 'Analyzing...' : '▶ Run Intake Analysis'}</span>
          </button>
        </div>

        {/* RIGHT: OUTPUT PANEL */}
        <div className="automaton-panel">
          <div className="automaton-panel-header">
            <div className="automaton-panel-step">Output</div>
            <div className="automaton-panel-title">Project Card</div>
            <div className="automaton-panel-sub">
              Structured JSON — ready to pipe into Step 02 Classification.
            </div>
          </div>

          <div className="automaton-divider" />

          {!lastResult && !error && (
            <div className="automaton-empty-state">
              <div className="automaton-empty-box">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <line x1="8" y1="9" x2="16" y2="9" stroke="#555"/>
                  <line x1="8" y1="13" x2="16" y2="13" stroke="#555"/>
                  <line x1="8" y1="17" x2="12" y2="17" stroke="#555"/>
                </svg>
              </div>
              <div>Upload files or paste a brief<br />then run the intake analysis</div>
            </div>
          )}

          {error && (
            <div className="automaton-error-msg">
              <strong>Error:</strong> {error}<br /><br />
              Make sure the Python backend is running:<br />
              <code>cd automaton-dashboard &amp;&amp; python server.py</code><br /><br />
              Then visit <code>http://localhost:8000</code>
            </div>
          )}

          {lastResult && (
            <div className="automaton-project-card">
              <div className="automaton-card-block">
                <div className="automaton-card-label">Project name</div>
                <div className="automaton-card-value large">{lastResult.project_name}</div>
              </div>

              <div className="automaton-card-block">
                <div className="automaton-card-label">Objective</div>
                <div className="automaton-card-value">{lastResult.objective}</div>
              </div>

              <div className="automaton-tag-row">
                <span className="automaton-tag tag-type">{lastResult.project_type}</span>
                <span className={`automaton-tag tag-priority-${lastResult.priority || 'Medium'}`}>
                  Priority: {lastResult.priority}
                </span>
                {lastResult.timeline_hint && (
                  <span className="automaton-tag tag-timeline">{lastResult.timeline_hint}</span>
                )}
              </div>

              {lastResult.brand_notes && (
                <div className="automaton-card-block">
                  <div className="automaton-card-label">Brand notes</div>
                  <div className="automaton-card-value">{lastResult.brand_notes}</div>
                </div>
              )}

              <div className="automaton-two-col">
                <div className="automaton-card-block">
                  <div className="automaton-card-label">Deliverables</div>
                  <div className="automaton-list-items">
                    {(lastResult.deliverables || []).map((x, i) => (
                      <div key={i} className="automaton-list-item deliverable">{x}</div>
                    ))}
                  </div>
                </div>
                <div className="automaton-card-block">
                  <div className="automaton-card-label">Risks / Gaps</div>
                  <div className="automaton-list-items">
                    {(lastResult.risks || []).map((x, i) => (
                      <div key={i} className="automaton-list-item risk">{x}</div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="automaton-card-block">
                <div className="automaton-card-label">Raw JSON</div>
                <div className="automaton-json-block">{JSON.stringify(lastResult, null, 2)}</div>
              </div>
            </div>
          )}

          {lastResult && (
            <div className="automaton-status-bar">
              <div className="automaton-status-dot" />
              <span>Processed · {processedTime} · JSON ready</span>
              <button type="button" className="automaton-export-btn" onClick={exportJSON}>
                Export JSON
              </button>
            </div>
          )}
        </div>

      </main>

      {/* STEP 2: CLASSIFICATION */}
      {lastResult && (
        <section className="automaton-step2-section" ref={step2Ref}>
          <div className="automaton-step2-header">
            <div className="automaton-panel-header">
              <div className="automaton-panel-step">Step 02 — Classification Engine</div>
              <div className="automaton-panel-title">Workflow Breakdown</div>
              <div className="automaton-panel-sub">
                Backbone analysis · Type-specific variables · AI integration points per phase.
              </div>
            </div>
            <button
              type="button"
              className="automaton-run-btn automaton-classify-btn"
              onClick={runClassify}
              disabled={classifying}
            >
              {classifying && <span className="automaton-spinner" />}
              <span>
                {classifying ? 'Classifying...' : workflowData ? '▶ Re-run Classification' : '▶ Run Classification'}
              </span>
            </button>
          </div>

          <div className="automaton-divider" />

          {classifyError && (
            <div className="automaton-error-msg">
              <strong>Error:</strong> {classifyError}
            </div>
          )}

          {workflowData && (
            <div className="automaton-step2-body">
              <div className="automaton-card-block">
                <div className="automaton-card-label">
                  Modular Breakdown — {workflowData.project_type}
                </div>
                <table className="automaton-breakdown-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Common Elements (Backbone)</th>
                      <th>Type-Specific Variables</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Asset Prep', (workflowData.backbone?.asset_prep || []).join('\n'), workflowData.type_variables?.asset_prep || ''],
                      ['Logic',      (workflowData.backbone?.logic      || []).join('\n'), workflowData.type_variables?.logic      || ''],
                      ['Review',     (workflowData.backbone?.review     || []).join('\n'), workflowData.type_variables?.review     || ''],
                    ].map(([cat, common, spec]) => (
                      <tr key={cat}>
                        <td>{cat}</td>
                        <td style={{ whiteSpace: 'pre-line' }}>{common}</td>
                        <td>{spec}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="automaton-phase-cards">
                {[
                  ['A', workflowData.phases?.A_visual_storyboard],
                  ['B', workflowData.phases?.B_artwork_structure],
                  ['C', workflowData.phases?.C_animation_setup],
                ]
                  .filter(([, p]) => p)
                  .map(([letter, p]) => (
                    <div key={letter} className="automaton-phase-card">
                      <div className="automaton-phase-card-header">
                        <div className="automaton-phase-letter">{letter}</div>
                        <div className="automaton-phase-title">{p.title}</div>
                      </div>
                      <div className="automaton-phase-tasks">
                        {(p.tasks || []).map((t, i) => (
                          <div key={i} className="automaton-phase-task">{t}</div>
                        ))}
                      </div>
                      <div className="automaton-ai-badge">AI — {p.ai_integration}</div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </section>
      )}

    </div>
  );
}

export { ANIMATION_TYPES };
export default AutomatonDashboard;
