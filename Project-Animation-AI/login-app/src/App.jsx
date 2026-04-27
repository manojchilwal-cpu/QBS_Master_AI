import { useEffect, useMemo, useRef, useState } from 'react';
import logoDark from './assets/logo-dark.svg';
import logoLight from './assets/logo-light.svg';
import { IconAdd, IconEdit, IconGrid, IconList, IconTrash, IconUser } from './icons';
import AutomatonDashboard, { ANIMATION_TYPES } from './AutomatonDashboard';

const initialState = {
  username: '',
  password: '',
  remember: false
};

const initialProjects = []; 

const formatFileSize = (kb) => {
  if (kb >= 1024) {
    return `${(kb / 1024).toFixed(1)} MB`;
  }
  return `${Math.round(kb)} KB`;
};

function App() {
  const [theme, setTheme] = useState('dark');
  const [form, setForm] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [projects, setProjects] = useState(initialProjects);
  const [projectForm, setProjectForm] = useState({
    name: '',
    type: '',
    description: '',
    access: 'Editor',
    sizeKB: 0
  });
  const [processing, setProcessing] = useState(false);
  const [projectStatus, setProjectStatus] = useState('Ready to create a new project.');
  const [projectError, setProjectError] = useState('');
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [openProjectMenuId, setOpenProjectMenuId] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [animationView, setAnimationView] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [setupObjective, setSetupObjective] = useState('');
  const [setupDesign, setSetupDesign] = useState('');
  const [setupTechnical, setSetupTechnical] = useState('');
  const [setupMessage, setSetupMessage] = useState('Upload your project brief to start AI context extraction.');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!openProjectMenuId) return undefined;

    const handleDocumentClick = (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.closest('.project-menu-button') || target.closest('.project-menu-dropdown')) {
        return;
      }
      setOpenProjectMenuId(null);
    };

    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, [openProjectMenuId]);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem('login-theme');
    const savedUsername = window.localStorage.getItem('saved-username');
    const savedUser = window.localStorage.getItem('login-user');
    const token = window.localStorage.getItem('auth-token');

    if (savedTheme) {
      setTheme(savedTheme);
    }

    if (savedUsername) {
      setForm((current) => ({ ...current, username: savedUsername, remember: true }));
    }

    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('login-theme', theme);
  }, [theme]);

  const activeLogo = useMemo(() => (theme === 'dark' ? logoDark : logoLight), [theme]);
  const apiBase = import.meta.env.DEV ? '' : 'http://localhost:4000';

  const handleChange = (field) => (event) => {
    const value = field === 'remember' ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleProjectChange = (field) => (event) => {
    const value = event.target.value;
    setProjectForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!form.username || !form.password) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${apiBase}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.username, password: form.password })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Login failed');
      }

      const userData = {
        username: result.user.username,
        accessLevel: result.user.username === 'admin' ? 'Admin' : 'Editor'
      };

      setUser(userData);
      setIsAuthenticated(true);
      window.localStorage.setItem('auth-token', result.token);
      window.localStorage.setItem('login-user', JSON.stringify(userData));

      setMessage(`Welcome, ${result.user.username}! Login successful.`);
      if (form.remember) {
        window.localStorage.setItem('saved-username', form.username);
      } else {
        window.localStorage.removeItem('saved-username');
      }
      setForm((current) => ({ ...current, password: '' }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProject = async (event) => {
    event.preventDefault();
    setProjectError('');
    const values = { ...projectForm };

    if (!values.name.trim() || !values.type.trim()) {
      setProjectError('Project name and type are required.');
      return;
    }

    setProcessing(true);
    setProjectStatus('Processing project file size…');
    setProjectForm((current) => ({ ...current, sizeKB: 0 }));

    const targetSize = Math.max(64, Math.floor(Math.random() * 1024) + 128);
    const steps = 8;
    const sizeStep = targetSize / steps;
    let currentSize = 0;

    const interval = setInterval(() => {
      currentSize += sizeStep;
      setProjectForm((current) => ({
        ...current,
        sizeKB: Math.min(currentSize, targetSize)
      }));
      setProjectStatus(`Calculating size: ${formatFileSize(Math.min(currentSize, targetSize))}`);
    }, 220);

    await new Promise((resolve) => setTimeout(resolve, 220 * (steps + 1)));
    clearInterval(interval);

    const finalSize = Math.round(targetSize);
    const newProject = {
      id: Date.now(),
      name: values.name.trim(),
      type: values.type.trim(),
      subtitle: values.description.trim() || 'No subtitle provided',
      sizeKB: finalSize,
      access: values.access
    };

    if (editingProjectId) {
      setProjects((current) => current.map((project) => (
        project.id === editingProjectId ? { ...project, name: values.name.trim(), type: values.type.trim(), subtitle: values.description.trim() || 'No subtitle provided', sizeKB: finalSize, access: values.access } : project
      )));
    } else {
      setProjects((current) => [newProject, ...current]);
    }

    setProcessing(false);
    setProjectStatus(`Project file size: ${formatFileSize(finalSize)}`);
    setProjectForm({
      name: '',
      type: '',
      description: '',
      access: values.access,
      sizeKB: 0
    });
    const wasEditing = !!editingProjectId;
    setEditingProjectId(null);
    closeProjectModal();
    if (!wasEditing && ANIMATION_TYPES.includes(values.type.trim())) {
      setAnimationView(newProject);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    window.localStorage.removeItem('auth-token');
    window.localStorage.removeItem('login-user');
  };

  const openProjectModal = () => {
    setProjectModalOpen(true);
    setProjectError('');
    setProjectStatus('Ready to create a new project.');
    setProjectForm({
      name: '',
      type: '',
      description: '',
      access: 'Editor',
      sizeKB: 0
    });
    setEditingProjectId(null);
  };

  const openProjectSetup = (project) => {
    setSelectedProjectId(project.id);
    setSetupObjective(project.setupObjective || '');
    setSetupDesign(project.setupDesign || '');
    setSetupTechnical(project.setupTechnical || '');
    setSetupMessage('AI analysis is in progress...');
    setOpenProjectMenuId(null);
  };

  const handleSaveSetup = () => {
    if (!selectedProject) return;
    setProjects((current) => current.map((project) => (
      project.id === selectedProject.id
        ? { ...project, setupObjective, setupDesign, setupTechnical }
        : project
    )));
    setSetupMessage('Project context saved successfully.');
  };

  const handleNextSetupStep = () => {
    setSetupMessage('Ready to move to step 2.');
  };

  const openEditProjectModal = (project) => {
    setProjectModalOpen(true);
    setProjectError('');
    setProjectStatus('Ready to update project.');
    setProjectForm({
      name: project.name,
      type: project.type,
      description: project.subtitle || '',
      access: project.access,
      sizeKB: project.sizeKB
    });
    setEditingProjectId(project.id);
    setOpenProjectMenuId(null);
  };

  const openDeleteConfirm = (project) => {
    setDeleteConfirmOpen(true);
    setProjectToDelete(project);
    setOpenProjectMenuId(null);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    setSetupMessage('Analyzing uploaded file...');

    setTimeout(() => {
      setSetupObjective('Provide design direction, goals, and brand priorities based on the uploaded brief.');
      setSetupDesign('Summarize the key interface, visual and interaction requirements that should guide the project.');
      setSetupTechnical('Capture technical constraints, integrations, platforms, and data handling needs for the implementation.');
      setSetupMessage('AI has analyzed your brief and populated draft project context. Review and edit each block as needed.');
    }, 1200);
  };

  const handleDraftContext = () => {
    setUploadedFile(null);
    setSetupMessage('Drafting context from scratch...');

    setTimeout(() => {
      setSetupObjective('Create a strong product objective and target audiences.');
      setSetupDesign('Outline the design system, accessibility, and tone for the experience.');
      setSetupTechnical('List technical requirements including APIs, platforms, and performance goals.');
      setSetupMessage('Draft context is ready. Refine the content in the fields below.');
    }, 1200);
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const clearSetupBlock = (block) => {
    if (block === 'objective') setSetupObjective('');
    if (block === 'design') setSetupDesign('');
    if (block === 'technical') setSetupTechnical('');
  };

  const closeProjectSetup = () => {
    setSelectedProjectId(null);
    setUploadedFile(null);
    setSetupMessage('Upload your project brief to start AI context extraction.');
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirmOpen(false);
    setProjectToDelete(null);
  };

  const handleDeleteProject = () => {
    if (projectToDelete) {
      setProjects((current) => current.filter((project) => project.id !== projectToDelete.id));
      closeDeleteConfirm();
    }
  };

  const closeProjectModal = () => {
    setProjectModalOpen(false);
    setProjectError('');
  };

  const selectedProject = projects.find((project) => project.id === selectedProjectId);
  const activeUser = user || { username: 'Username', accessLevel: 'Editor' };

  return (
    <div className={`page-shell ${isAuthenticated ? 'dashboard-shell' : ''}`}>
      {!isAuthenticated && (
        <section className="hero-panel">
          <div className="hero-logo-wrap">
            <img src={activeLogo} alt="LLM Design brand" />
          </div>
        </section>
      )}

      <section className={isAuthenticated ? 'dashboard-panel' : 'login-panel'}>
        {isAuthenticated && !animationView && (
          <div className="dashboard-profile">
            <div className="avatar"><IconUser className="profile-icon" /></div>
            <div className="profile-text">
              <strong>{activeUser.username}</strong>
              <span>{activeUser.accessLevel}</span>
            </div>
            <button className="logout-button" type="button" onClick={handleLogout}>
              Log out
            </button>
          </div>
        )}

        {!animationView && (
          <div className="login-meta">
            <span>LLM Design version 1.0</span>
          </div>
        )}

        {isAuthenticated && !selectedProject && !animationView && (
          <div className="dashboard-actions">
            <button
              type="button"
              className="add-project-button"
              onClick={openProjectModal}
            >
              <IconAdd className="button-icon" />Add Project
            </button>
            <div className="view-toggle">
              <button type="button" className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}>
                <IconGrid className="button-icon" />
              </button>
              <button type="button" className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>
                <IconList className="button-icon" />
              </button>
            </div>
          </div>
        )}

        {!isAuthenticated ? (
          <div className="login-card">
            <header className="login-header">
              <h1>login</h1>
              <p>Sign in to access your dashboard with secure authentication.</p>
            </header>

            <form onSubmit={handleSubmit} className="login-form" noValidate>
              <div className="field-row">
                <input
                  id="username"
                  type="text"
                  value={form.username}
                  onChange={handleChange('username')}
                  placeholder="Username"
                  autoComplete="username"
                  aria-label="Username"
                />
              </div>

              <div className="field-row">
                <input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange('password')}
                  placeholder="Password"
                  autoComplete="current-password"
                  aria-label="Password"
                />
              </div>

              <div className="login-footer-row">
                <label className="checkbox-label"><input
                    type="checkbox"
                    checked={form.remember}
                    onChange={handleChange('remember')}
                  />Remember me</label>
                <button
                  type="button"
                  className="text-link"
                  onClick={() => setMessage('Use demo credentials: admin / Demo1234!')}
                >
                  Forgot password?
                </button>
              </div>

              {error && <div className="form-alert error">{error}</div>}
              {message && <div className="form-alert success">{message}</div>}

              <button type="submit" className="submit-button" disabled={loading}>
                {loading ? 'Logging in...' : 'login'}
              </button>
            </form>
          </div>
        ) : animationView ? (
          <AutomatonDashboard project={animationView} onBack={() => setAnimationView(null)} />
        ) : (
          <main className="dashboard-content">
            {projectModalOpen && (
              <div className="project-modal-overlay" onClick={closeProjectModal}>
                <div className="project-modal" onClick={(event) => event.stopPropagation()}>
                  <button type="button" className="modal-close" onClick={closeProjectModal}>
                    ×
                  </button>
                  <div className="project-form-card project-modal-card">
                    <div className="project-form-header">
                      <h2>{editingProjectId ? 'Edit project' : 'Create new project'}</h2>
                      <p>Enter the details below to generate or update a project and watch the file size update dynamically.</p>
                    </div>
                    <form onSubmit={handleAddProject} className="project-form" noValidate>
                      <div className="form-row">
                        <label>Project name</label>
                        <input
                          type="text"
                          value={projectForm.name}
                          onChange={handleProjectChange('name')}
                          placeholder="Enter project name"
                        />
                      </div>

                      <div className="form-row">
                        <label>Project type</label>
                        <select value={projectForm.type} onChange={handleProjectChange('type')}>
                          <option value="">Select project type</option>
                          <optgroup label="Animation">
                            <option value="2D Animation">2D Animation</option>
                            <option value="Motion Graphics">Motion Graphics</option>
                            <option value="Whiteboard Animation">Whiteboard Animation</option>
                            <option value="Slideshow">Slideshow</option>
                          </optgroup>
                          <optgroup label="Design">
                            <option value="Branding">Branding</option>
                            <option value="UI/UX">UI/UX</option>
                            <option value="Web App">Web App</option>
                            <option value="Other">Other</option>
                          </optgroup>
                        </select>
                      </div>

                      <div className="form-row">
                        <label>Access level</label>
                        <select value={projectForm.access} onChange={handleProjectChange('access')}>
                          <option>Admin</option>
                          <option>Editor</option>
                          <option>Reviewer</option>
                          <option>Designer</option>
                          <option>Developer</option>
                        </select>
                      </div>

                      <div className="form-row">
                        <label>Project description</label>
                        <textarea
                          rows="3"
                          value={projectForm.description}
                          onChange={handleProjectChange('description')}
                          placeholder="Add a short subtitle or project notes"
                        />
                      </div>

                      <div className="project-summary">
                        <div>
                          <span className="summary-label">File size</span>
                          <strong>{formatFileSize(projectForm.sizeKB || 0)}</strong>
                        </div>
                        <div>
                          <span className="summary-label">Status</span>
                          <strong>{processing ? 'Processing...' : 'Ready'}</strong>
                        </div>
                      </div>

                      {projectError && <div className="form-alert error">{projectError}</div>}
                      <button type="submit" className="submit-button" disabled={processing}>
                        {processing ? 'Processing…' : editingProjectId ? 'Save changes' : '+ Create project'}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {deleteConfirmOpen && (
              <div className="project-modal-overlay" onClick={closeDeleteConfirm}>
                <div className="project-modal delete-confirm-modal" onClick={(event) => event.stopPropagation()}>
                  <button type="button" className="modal-close" onClick={closeDeleteConfirm}>
                    ×
                  </button>
                  <div className="project-form-card project-modal-card">
                    <div className="project-form-header">
                      <h2>Confirm delete</h2>
                      <p>Are you sure you want to delete this project? This action cannot be undone.</p>
                    </div>
                    <div className="project-form delete-confirm-content">
                      <div className="delete-confirm-actions">
                        <button type="button" className="cancel-button" onClick={closeDeleteConfirm}>
                          Cancel
                        </button>
                        <button type="button" className="submit-button delete-button" onClick={handleDeleteProject}>
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedProject ? (
              <section className="project-setup-page">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".docx,.pdf,.txt,.odt,.xlsx,.pptx"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />

                <div className="project-setup-header">
                  <button type="button" className="back-button" onClick={closeProjectSetup}>
                    ← Back to projects
                  </button>
                </div>

                <div className="project-setup-content">
                  <div className="project-setup-empty">
                    <p>The project setup page has been simplified. Upload, draft, steps, and specification sections are removed.</p>
                  </div>
                </div>
              </section>
            ) : (
              <section className="project-listing">
                {viewMode === 'grid' ? (
                  <div className="project-grid">
                    {projects.map((project) => (
                      <article
                        key={project.id}
                        className={`project-card${selectedProjectId === project.id ? ' selected' : ''}`}
                        onClick={() => openProjectSetup(project)}
                      >
                        <div className="project-card-top">
                          <span className="project-checkbox" />
                          <button
                            type="button"
                            className="project-menu-button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setOpenProjectMenuId(openProjectMenuId === project.id ? null : project.id);
                            }}
                            aria-label="Open project actions"
                          >
                            <span />
                            <span />
                            <span />
                          </button>
                          {openProjectMenuId === project.id && (
                            <div className="project-menu-dropdown">
                              <button type="button" onClick={(event) => { event.stopPropagation(); openEditProjectModal(project); }}>Edit</button>
                              <button type="button" onClick={(event) => { event.stopPropagation(); openDeleteConfirm(project); }}>Delete</button>
                            </div>
                          )}
                        </div>
                        <div className="project-card-body">
                          <strong className="project-name">{project.name}</strong>
                          <p className="project-type">{project.type}</p>
                          <span className="project-access">{project.access}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="project-table">
                    <div className="project-table-head">
                      <span>Project name</span>
                      <span>Project type</span>
                      <span>Access level</span>
                      <span>Actions</span>
                    </div>
                    {projects.map((project) => (
                      <div
                        key={project.id}
                        className={`project-table-row${selectedProjectId === project.id ? ' selected' : ''}`}
                        onClick={() => openProjectSetup(project)}
                      >
                        <div>
                          <span className="project-checkbox" />
                          <div>
                            <strong>{project.name}</strong>
                          </div>
                        </div>
                        <span>{project.type}</span>
                        <span>{project.access}</span>
                        <span className="project-row-actions">
                          <button
                            type="button"
                            className="icon-action-button"
                            onClick={(event) => { event.stopPropagation(); openEditProjectModal(project); }}
                            aria-label="Edit project"
                          >
                            <IconEdit className="action-icon" />
                          </button>
                          <button
                            type="button"
                            className="icon-action-button"
                            onClick={(event) => { event.stopPropagation(); openDeleteConfirm(project); }}
                            aria-label="Delete project"
                          >
                            <IconTrash className="action-icon" />
                          </button>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
            </main>
          )}

        <button className="theme-toggle" type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
      </section>
    </div>
  );
}

export default App;
