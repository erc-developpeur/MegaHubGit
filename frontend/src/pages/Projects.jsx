import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Folder, 
  GitBranch, 
  Plus, 
  Search, 
  Trash2, 
  Clipboard, 
  ExternalLink, 
  Image as ImageIcon,
  Smile,
  AlertCircle,
  Clock,
  CheckCircle2,
  Box,
  ArrowUpRight
} from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { projectsApi, gitApi } from '../api/index.js';

// ── Emoji Picker ──────────────────────────────────────────────────────────────
const EMOJI_PRESETS = [
  '💻','⚛️','🐍','💎','🦀','☕','🐘','🟦','🎯','🔷',
  '🐳','🔧','⚙️','🛠️','🔩','📦','🚀','☁️','🔐','🛡️',
  '🌐','📱','🎮','🎨','📊','📈','🗄️','🤖','✨','⚡',
  '📂','📁','🏗️','🔬','🧪','🧩','💡','🏆','⭐',
  '🦊','🐙','🐱','🦁','🐉','🦄','🐝','🦋','🐤','🌟',
];

function IconPicker({ currentIcon, onSelect, onUpload, onClose }) {
  const ref = useRef();
  const fileInputRef = useRef();

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div ref={ref} onClick={e => e.stopPropagation()} className="picker-container" style={{
      position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 999,
      background: 'var(--bg-card)',
      backdropFilter: 'blur(12px)',
      border: '1px solid var(--border)',
      borderRadius: '16px', padding: '16px', width: 260,
      boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
      animation: 'picker-fade-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
    }}>
      <style>{`
        @keyframes picker-fade-in {
          from { opacity: 0; transform: translateY(-10px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .emoji-grid-custom {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 8px;
          margin-bottom: 16px;
        }
        .emoji-btn-custom {
          font-size: 20px;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 8px;
          padding: 8px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .emoji-btn-custom:hover {
          background: rgba(255, 255, 255, 0.05);
          transform: scale(1.1);
        }
      `}</style>
      
      <div className="emoji-grid-custom">
        {EMOJI_PRESETS.map(e => (
          <button key={e} className="emoji-btn-custom" onClick={() => onSelect(e)}>
            {e}
          </button>
        ))}
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept="image/*"
          onChange={(e) => {
            if (e.target.files[0]) onUpload(e.target.files[0]);
          }}
        />
        <button className="btn-upgrade" onClick={() => fileInputRef.current.click()}>
          <ImageIcon size={14} style={{ marginRight: 8 }} /> Upload Image
        </button>
        <button onClick={() => onSelect(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer' }}>
          Reset to default
        </button>
      </div>
    </div>
  );
}

// ── Modals & Items ────────────────────────────────────────────────────────────

function AddProjectModal({ onClose, onAdded }) {
  const [path, setPath] = useState('');
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [clonePath, setClonePath] = useState('');
  const [mode, setMode] = useState('local');
  const [followOnly, setFollowOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'local') {
        const project = await projectsApi.add({ 
          path: path.trim(), 
          name: name.trim() || undefined,
          followOnly 
        });
        onAdded(project);
      } else {
        const result = await gitApi.clone(url.trim(), clonePath.trim(), { depth: followOnly ? 1 : undefined });
        await projectsApi.add({ 
          path: result.path, 
          followOnly 
        });
        await onAdded({ path: result.path, followOnly });
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal card-premium" style={{ maxWidth: '500px', width: '90%' }}>
        <div className="card-premium-header">
          <span className="card-premium-title">Add Project</span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
          Link a local Git repository or clone one from a URL.
        </p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <button className={`btn ${mode === 'local' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMode('local')} style={{ flex: 1 }}>
            Local Directory
          </button>
          <button className={`btn ${mode === 'clone' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMode('clone')} style={{ flex: 1 }}>
            Clone URL
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {mode === 'local' ? (
              <div className="form-group">
                <label style={{ fontSize: 12, fontWeight: 500, marginBottom: 8, display: 'block' }}>Repository Path *</label>
                <input
                  className="input"
                  placeholder="E:\projects\my-app"
                  value={path}
                  onChange={e => {
                    const val = e.target.value;
                    setPath(val);
                    // UX: Auto-detect if user pastes a URL instead of a path
                    if (val.trim().match(/^(https?:\/\/|git@)/)) {
                      setMode('clone');
                      setUrl(val.trim());
                      setPath('');
                      setError('');
                    }
                  }}
                  required
                />
                {path.trim().match(/^(https?:\/\/|git@)/) && (
                  <div style={{ color: 'var(--accent)', fontSize: 11, marginTop: 4 }}>
                    💡 It looks like you pasted a URL. Switching to Clone Mode...
                  </div>
                )}
              </div>
          ) : (
            <>
              <div className="form-group">
                <label style={{ fontSize: 12, fontWeight: 500, marginBottom: 8, display: 'block' }}>Repository URL *</label>
                <input
                  className="input"
                  placeholder="https://github.com/user/repo.git"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label style={{ fontSize: 12, fontWeight: 500, marginBottom: 8, display: 'block' }}>Clone into *</label>
                <input
                  className="input"
                  placeholder="E:\projects\my-app"
                  value={clonePath}
                  onChange={e => setClonePath(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          <div 
            className="form-group" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 12, 
              padding: '12px',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              cursor: 'pointer'
            }}
            onClick={() => setFollowOnly(!followOnly)}
          >
            <input 
              type="checkbox" 
              checked={followOnly} 
              onChange={() => {}} // Handled by div
              style={{ width: 18, height: 18, accentColor: 'var(--accent)' }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Follow Mode (Read-Only)</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Clone faster (shallow) & disable local edits. Ideal for tracking upstream projects.
              </div>
            </div>
          </div>

          {error && <div style={{ color: 'var(--red)', fontSize: 12 }}>⚠ {error}</div>}

          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading} style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" className={`btn btn-primary ${loading ? 'btn-loading' : ''}`} disabled={loading} style={{ flex: 1 }}>
              {loading ? 'Processing...' : 'Confirm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProjectCard({ project, onSelect, onRemove, onIconChange }) {
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleIconSelect(emoji) {
    setShowPicker(false);
    setSaving(true);
    try {
      await projectsApi.update(project.id, { icon: emoji });
      onIconChange(project.id, emoji, null);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoUpload(file) {
    setShowPicker(false);
    setSaving(true);
    try {
      const updated = await projectsApi.uploadLogo(project.id, file);
      onIconChange(project.id, null, updated.logo);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="folder-card" style={{ cursor: 'default' }}>
      <div className="folder-card-icon-area" onClick={() => setShowPicker(!showPicker)} style={{ cursor: 'pointer' }}>
        {project.logo ? (
          <img src={`http://127.0.0.1:3001${project.logo}`} alt="" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '8px' }} />
        ) : (
          <span style={{ fontSize: 28 }}>{project.icon || '📁'}</span>
        )}
        <div style={{ position: 'absolute', bottom: 8, right: 8 }}>
          <div className={`status-dot ${project.hasChanges ? 'yellow' : 'green'}`} style={{ width: 10, height: 10 }} />
        </div>
        {showPicker && (
          <IconPicker 
            currentIcon={project.icon} 
            onSelect={handleIconSelect} 
            onUpload={handleLogoUpload}
            onClose={() => setShowPicker(false)} 
          />
        )}
      </div>

      <div className="folder-card-meta">
        <div style={{ display: 'flex', gap: 4 }}>
          {project.branch && <span className="badge badge-gray" style={{ fontSize: 9 }}>{project.branch}</span>}
          {project.isGit && <span className="badge badge-purple" style={{ fontSize: 9 }}>GIT</span>}
        </div>
        <span className="folder-card-count">{project.modifiedCount || 0} changes</span>
      </div>

      <div className="folder-card-title">{project.name}</div>
      <div className="folder-card-desc" style={{ fontSize: 11, fontFamily: 'monospace', opacity: 0.6 }}>
        {project.path || project.repoUrl || 'Remote Repository'}
      </div>

      <div className="folder-card-actions">
        <div className="folder-action-btn" onClick={onSelect}>
          <ArrowUpRight className="folder-action-icon" />
          <span>Open Panel</span>
        </div>
        <div className="folder-action-btn" onClick={() => project.path && navigator.clipboard.writeText(project.path)} style={{ opacity: project.path ? 1 : 0.4, cursor: project.path ? 'pointer' : 'not-allowed' }}>
          <Clipboard className="folder-action-icon" />
        </div>
        <div className="folder-action-btn" style={{ marginLeft: 'auto', color: 'var(--red)' }} onClick={onRemove}>
          <Trash2 className="folder-action-icon" />
        </div>
      </div>
    </div>
  );
}

export default function Projects() {
  const { projects, dispatch, toast, loadProjects, projectsLoading } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const filtered = projects
    .filter(p => !p.followOnly) // Exclude followed projects
    .filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.path && p.path.toLowerCase().includes(search.toLowerCase())) ||
      (p.repoUrl && p.repoUrl.toLowerCase().includes(search.toLowerCase()))
    );

  async function handleRemove(id) {
    if (!confirm('Remove this project? (Disk files won\'t be touched)')) return;
    try {
      await projectsApi.remove(id);
      dispatch({ type: 'REMOVE_PROJECT', payload: id });
      toast('Project removed', 'info');
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  function handleSelect(project) {
    dispatch({ type: 'SELECT_PROJECT', payload: project.id });
    navigate('/git');
  }

  function handleIconChange(id, icon, logo) {
    dispatch({ type: 'UPDATE_PROJECT', payload: { id, icon, logo } });
  }

  return (
    <div className="page-content">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Projects</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Manage your local Git repositories and workspaces.</p>
        </div>
        <button className="btn-upgrade" style={{ width: 'auto', padding: '8px 16px' }} onClick={() => setShowAddModal(true)}>
          <Plus size={14} style={{ marginRight: 6 }} /> Add Project
        </button>
      </div>

      <div className="stats-row" style={{ marginBottom: 40 }}>
        <div className="stat-card-premium" style={{ padding: '16px 20px' }}>
          <div className="stat-card-info">
            <span className="stat-card-label">Total</span>
            <div className="stat-card-value" style={{ fontSize: 24 }}>{projects.length}</div>
          </div>
          <Box className="text-muted" size={20} />
        </div>
        <div className="stat-card-premium" style={{ padding: '16px 20px' }}>
          <div className="stat-card-info">
            <span className="stat-card-label">Modified</span>
            <div className="stat-card-value" style={{ fontSize: 24, color: 'var(--yellow)' }}>
              {projects.filter(p => p.hasChanges).length}
            </div>
          </div>
          <Clock size={20} className="text-secondary" />
        </div>
        <div className="stat-card-premium" style={{ padding: '16px 20px' }}>
          <div className="stat-card-info">
            <span className="stat-card-label">Behind</span>
            <div className="stat-card-value" style={{ fontSize: 24, color: 'var(--blue)' }}>
               {projects.filter(p => p.behind > 0).length}
            </div>
          </div>
          <AlertCircle size={20} className="text-secondary" />
        </div>
        <div className="stat-card-premium" style={{ padding: '16px 20px' }}>
          <div className="stat-card-info">
            <span className="stat-card-label">Healthy</span>
            <div className="stat-card-value" style={{ fontSize: 24, color: 'var(--green)' }}>
              {projects.filter(p => p.isGit && !p.hasChanges && !p.behind).length}
            </div>
          </div>
          <CheckCircle2 size={20} className="text-secondary" />
        </div>
      </div>

      <div style={{ position: 'relative', marginBottom: 32 }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input 
          className="input" 
          placeholder="Search repositories..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: 40, background: 'var(--bg-card)', border: '1px solid var(--border)', maxWidth: 400 }} 
        />
      </div>

      <div className="folder-grid">
        {filtered.map(p => (
          <ProjectCard key={p.id} project={p} onSelect={() => handleSelect(p)} onRemove={() => handleRemove(p.id)} onIconChange={handleIconChange} />
        ))}
      </div>

      {showAddModal && <AddProjectModal onClose={() => setShowAddModal(false)} onAdded={loadProjects} />}
    </div>
  );
}
