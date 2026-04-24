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
  ArrowUpRight,
  Radio
} from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { projectsApi, gitApi } from '../api/index.js';

// ── Emoji Picker (Minimal version for Following) ──────────────────────────────
const EMOJI_PRESETS = [
  '⭐', '🚀', '🔥', '✨', '🌈', '🛠️', '🧩', '📦', '⚡', '💻',
  '⚛️', '🐍', '💎', '🦀', '☕', '🐘', '🟦', '🎯', '🔷', '🔶',
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
      borderRadius: '16px', padding: '16px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
    }}>
      <style>{`
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
        <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={(e) => e.target.files[0] && onUpload(e.target.files[0])} />
        <button className="btn-upgrade" onClick={() => fileInputRef.current.click()}>
          <ImageIcon size={14} style={{ marginRight: 8 }} /> Upload Image
        </button>
      </div>
    </div>
  );
}

// ── Modals & Items ────────────────────────────────────────────────────────────

function AddFollowedModal({ onClose, onAdded }) {
  const [url, setUrl] = useState('');
  const [clonePath, setClonePath] = useState('');
  const [isLite, setIsLite] = useState(true); // Default to Lite for external repos
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      let finalPath = clonePath;

      if (!isLite) {
        const result = await gitApi.clone(url.trim(), clonePath.trim(), { depth: 1 });
        finalPath = result.path;
      }

      await projectsApi.add({
        path: isLite ? null : finalPath,
        repoUrl: url.trim(),
        isLite: isLite,
        followOnly: true
      });

      await onAdded();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Auto-generate path from URL
  const handleUrlChange = (newUrl) => {
    setUrl(newUrl);
    if (!clonePath || clonePath.includes('external')) {
      const match = newUrl.match(/\/([^\/]+?)(?:\.git)?$/);
      if (match && match[1]) {
        setClonePath(`E:\\PROJET ERC WEB\\PROJET\\MegaHubGit\\external\\${match[1]}`);
      }
    }
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal card-premium" style={{ maxWidth: '500px', width: '90%' }}>
        <div className="card-premium-header">
          <span className="card-premium-title">Follow Repository</span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 24 }}>
          {isLite
            ? "Track evolution via GitHub API (Zero disk space usage)."
            : "Clone and track an external repository locally (Follow Mode)."}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{
            display: 'flex',
            background: 'var(--bg-dark)',
            padding: '4px',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            marginBottom: 8
          }}>
            <button
              type="button"
              className={`btn ${isLite ? 'btn-primary' : ''}`}
              style={{ flex: 1, fontSize: 11, padding: '8px', border: 'none' }}
              onClick={() => setIsLite(true)}
            >
              Lite Track (API Only)
            </button>
            <button
              type="button"
              className={`btn ${!isLite ? 'btn-primary' : ''}`}
              style={{ flex: 1, fontSize: 11, padding: '8px', border: 'none' }}
              onClick={() => setIsLite(false)}
            >
              Full Clone (Local)
            </button>
          </div>

          <div className="form-group">
            <label style={{ fontSize: 12, fontWeight: 500, marginBottom: 8, display: 'block' }}>Repository URL *</label>
            <input
              className="input"
              placeholder="https://github.com/flutter/flutter.git"
              value={url}
              onChange={e => handleUrlChange(e.target.value)}
              required
            />
          </div>

          {!isLite && (
            <div className="form-group">
              <label style={{ fontSize: 12, fontWeight: 500, marginBottom: 8, display: 'block' }}>Local Path *</label>
              <input
                className="input"
                placeholder="E:\\PROJET ERC WEB\\PROJET\\MegaHubGit\\external\\flutter"
                value={clonePath}
                onChange={e => setClonePath(e.target.value)}
                required
              />
              <span style={{ fontSize: 10, color: 'var(--accent)', marginTop: 4, display: 'block' }}>💡 Automatically suggested based on the repository name.</span>
            </div>
          )}

          {isLite && (
            <div style={{ background: 'rgba(var(--accent-rgb), 0.05)', padding: '12px', borderRadius: '12px', border: '1px dashed var(--accent)' }}>
              <span style={{ fontSize: 11, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={14} /> This repository will not be downloaded.
              </span>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                Mega Hub will fetch branches and commits in real-time using GitHub's API.
              </p>
            </div>
          )}

          {error && <div style={{ color: 'var(--red)', fontSize: 12 }}>⚠ {error}</div>}

          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading} style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className={`btn btn-primary ${loading ? 'btn-loading' : ''}`} disabled={loading} style={{ flex: 1 }}>
              {loading ? (isLite ? 'Connecting...' : 'Cloning...') : 'Confirm Following'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FollowedCard({ project, onSelect, onRemove, onIconChange }) {
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleIconSelect(emoji) {
    setShowPicker(false);
    setSaving(true);
    try {
      await projectsApi.update(project.id, { icon: emoji });
      onIconChange(project.id, emoji, null);
    } catch (e) { console.error(e); } finally { setSaving(false); }
  }

  async function handleLogoUpload(file) {
    setShowPicker(false);
    setSaving(true);
    try {
      const updated = await projectsApi.uploadLogo(project.id, file);
      onIconChange(project.id, null, updated.logo);
    } catch (e) { console.error(e); } finally { setSaving(false); }
  }

  return (
    <div className="folder-card" style={{ border: '1px solid rgba(var(--accent-rgb), 0.2)' }}>
      <div className="folder-card-icon-area" onClick={() => setShowPicker(!showPicker)} style={{ cursor: 'pointer' }}>
        {project.logo ? (
          <img src={`http://127.0.0.1:3001${project.logo}`} alt="" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '8px' }} />
        ) : (
          <span style={{ fontSize: 28 }}>{project.icon || '⭐'}</span>
        )}
        <div style={{ position: 'absolute', bottom: 8, right: 8 }}>
          <div className="status-dot blue" style={{ width: 10, height: 10, boxShadow: '0 0 10px var(--accent)' }} />
        </div>
        {showPicker && (
          <IconPicker currentIcon={project.icon} onSelect={handleIconSelect} onUpload={handleLogoUpload} onClose={() => setShowPicker(false)} />
        )}
      </div>

      <div className="folder-card-meta">
        <div style={{ display: 'flex', gap: 4 }}>
          {project.branch && <span className="badge badge-gray" style={{ fontSize: 9 }}>{project.branch}</span>}
          <span className="badge" style={{ fontSize: 9, background: 'rgba(var(--accent-rgb), 0.1)', color: 'var(--accent)', fontWeight: 800 }}>FOLLOWED</span>
          {project.isLite && <span className="badge" style={{ fontSize: 9, background: 'rgba(255, 255, 255, 0.1)', color: '#fff' }}>LITE</span>}
        </div>
      </div>

      <div className="folder-card-title">{project.name}</div>
      <div className="folder-card-desc" style={{ fontSize: 11, fontFamily: 'monospace', opacity: 0.6 }}>
        {project.isLite ? project.repoUrl : project.path}
      </div>

      <div className="folder-card-actions">
        <div className="folder-action-btn" onClick={onSelect} style={{ border: '1px solid var(--accent)', color: 'var(--accent)' }}>
          <ArrowUpRight className="folder-action-icon" />
          <span>Track Updates</span>
        </div>
        <div className="folder-action-btn" style={{ marginLeft: 'auto', color: 'var(--red)' }} onClick={onRemove}>
          <Trash2 className="folder-action-icon" />
        </div>
      </div>
    </div>
  );
}

export default function Following() {
  const { projects, dispatch, toast, loadProjects } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const followed = projects.filter(p => p.followOnly);
  const filtered = followed.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.path.toLowerCase().includes(search.toLowerCase())
  );

  async function handleRemove(id) {
    if (!confirm('Stop following this repository?')) return;
    try {
      await projectsApi.remove(id);
      dispatch({ type: 'REMOVE_PROJECT', payload: id });
      toast('Repository removed', 'info');
    } catch (err) { toast(err.message, 'error'); }
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
          <h1 className="dashboard-title">Following</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Track external repositories and stay up-to-date with upstream changes.</p>
        </div>
        <button className="btn-upgrade" style={{ width: 'auto', padding: '8px 16px', border: 'none' }} onClick={() => setShowAddModal(true)}>
          <Radio size={14} style={{ marginRight: 6 }} /> Follow New Repo
        </button>
      </div>

      {followed.length > 0 ? (
        <>
          <div style={{ position: 'relative', marginBottom: 32 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="input" placeholder="Search followed repositories..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 40, background: 'var(--bg-card)', border: '1px solid var(--border)', maxWidth: 400 }} />
          </div>

          <div className="folder-grid">
            {filtered.map(p => (
              <FollowedCard key={p.id} project={p} onSelect={() => handleSelect(p)} onRemove={() => handleRemove(p.id)} onIconChange={handleIconChange} />
            ))}
          </div>
        </>
      ) : (
        <div className="card-premium" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px', textAlign: 'center' }}>
          <Radio size={48} style={{ color: 'var(--accent)', marginBottom: 20, opacity: 0.5 }} />
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff' }}>Not following any repositories yet</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '12px 0 24px' }}>
            Start tracking external projects like Flutter or React to monitor their branches and commits in real-time.
          </p>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>Follow your first repository</button>
        </div>
      )}

      {showAddModal && <AddFollowedModal onClose={() => setShowAddModal(false)} onAdded={loadProjects} />}
    </div>
  );
}
