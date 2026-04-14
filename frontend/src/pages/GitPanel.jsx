import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ArrowUpRight,
  MoreVertical,
  Maximize2,
  Layout,
  GitPullRequest,
  Calendar,
  Layers,
  Settings as SettingsIcon,
  ChevronRight,
  GitBranch,
  Shield,
  Radio,
  ExternalLink,
  Sparkles,
  Bug,
  FileText,
  Palette,
  RefreshCw,
  Zap,
  Beaker,
  Terminal,
  GitCommit
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { gitApi, githubApi } from '../api/index.js';

// ── Helpers ───────────────────────────────────────────────────

function getCommitIcon(message) {
  const msg = message.toLowerCase();
  if (msg.startsWith('feat')) return { icon: <Sparkles size={14} />, color: '#6366f1' };
  if (msg.startsWith('fix')) return { icon: <Bug size={14} />, color: '#ef4444' };
  if (msg.startsWith('docs')) return { icon: <FileText size={14} />, color: '#10b981' };
  if (msg.startsWith('style')) return { icon: <Palette size={14} />, color: '#ec4899' };
  if (msg.startsWith('refactor')) return { icon: <RefreshCw size={14} />, color: '#8b5cf6' };
  if (msg.startsWith('perf')) return { icon: <Zap size={14} />, color: '#f59e0b' };
  if (msg.startsWith('test')) return { icon: <Beaker size={14} />, color: '#3b82f6' };
  if (msg.startsWith('build') || msg.startsWith('ci')) return { icon: <Terminal size={14} />, color: '#6b7280' };
  if (msg.startsWith('chore')) return { icon: <SettingsIcon size={14} />, color: '#94a3b8' };
  return { icon: <GitCommit size={14} />, color: '#6b7280' };
}

// ── Helper sub-components ─────────────────────────────────────

function FileRow({ file, type, onStage, onUnstage, onDiff }) {
  const statusMap = {
    M: 'M', A: 'A', D: 'D', '?': 'U', R: 'R', C: 'C',
  };
  const status = statusMap[file[0]] || 'M';

  return (
    <div className="file-item" onClick={() => onDiff(file, type === 'staged')}>
      <div className={`file-status ${status}`}>{status}</div>
      <span className="file-name" title={file}>{file.replace(/^["']|["']$/g, '')}</span>
      {type === 'staged' ? (
        <button
          className="btn btn-ghost btn-xs file-action"
          onClick={e => { e.stopPropagation(); onUnstage(file); }}
          title="Unstage"
        >↙ Unstage</button>
      ) : (
        <button
          className="btn btn-success btn-xs file-action"
          onClick={e => { e.stopPropagation(); onStage(file); }}
          title="Stage"
        >↗ Stage</button>
      )}
    </div>
  );
}

function DiffPanel({ diff, file, onClose }) {
  if (!diff) return null;

  const lines = diff.split('\n');

  function lineClass(line) {
    if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('diff ') || line.startsWith('index ')) return 'header';
    if (line.startsWith('@@')) return 'header';
    if (line.startsWith('+')) return 'added';
    if (line.startsWith('-')) return 'removed';
    return 'meta';
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--bg-overlay)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, backdropFilter: 'blur(4px)',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-hover)',
        borderRadius: 'var(--radius-xl)', width: '80vw', maxHeight: '80vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: 'var(--shadow-card)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justify: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
        }}>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: 13, color: 'var(--accent-light)' }}>{file}</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ marginLeft: 'auto' }}>✕ Close</button>
        </div>
        <div className="diff-viewer" style={{ flex: 1, borderRadius: 0, border: 'none' }}>
          {lines.map((line, i) => (
            <div key={i} className={`diff-line ${lineClass(line)}`}>{line || ' '}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BranchViewSelector({ onSelect, onSkip }) {
  return (
    <div className="branch-selector-overlay">
      <div className="branch-selector-card">
        <h2 className="selector-title">Workflow Visualization</h2>
        <p className="selector-desc">Choose your preferred way to manage branches.</p>
        
        <div className="selector-options">
          <div className="selector-option" onClick={() => onSelect('timeline')}>
            <div className="option-preview timeline-preview"></div>
            <div className="option-info">
              <Calendar size={24} />
              <span>Timeline View</span>
            </div>
          </div>

          <div className="selector-option" onClick={() => onSelect('graph')}>
            <div className="option-preview graph-preview"></div>
            <div className="option-info">
              <GitBranch size={24} />
              <span>Node Graph</span>
            </div>
          </div>
        </div>

        <button 
          className="btn btn-ghost btn-xs" 
          onClick={onSkip}
          style={{ marginTop: 40, opacity: 0.5 }}
        >
          Keep default list for now
        </button>
      </div>
    </div>
  );
}

function BranchTimelineView({ branches, onSwitch, loading, isLite }) {
  const localBranches = isLite ? branches : branches.filter(b => !b.remote);
  const totalWidth = Math.max(1200, 400 + localBranches.length * 180);
  
  return (
    <div className="timeline-view-container" style={{ 
      overflowX: 'auto', 
      paddingBottom: 20,
      background: 'rgba(0,0,0,0.2)',
      borderRadius: '12px',
      border: '1px solid var(--border)',
      position: 'relative'
    }}>
      <style>{`
        .timeline-axis {
          display: flex;
          border-bottom: 1px solid var(--border);
          padding: 12px 0 12px 200px;
          background: var(--bg-card);
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .axis-point {
          width: 200px;
          font-size: 11px;
          color: var(--text-muted);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          border-left: 1px solid rgba(255,255,255,0.05);
          padding-left: 12px;
        }
        .timeline-content {
          padding-top: 10px;
        }
        .timeline-row {
          display: flex;
          align-items: center;
          height: 44px;
          border-bottom: 1px solid rgba(255,255,255,0.02);
          transition: background 0.2s;
          cursor: pointer;
        }
        .timeline-row:hover {
          background: rgba(255,255,255,0.03);
        }
        .timeline-branch-label {
          width: 200px;
          flex-shrink: 0;
          padding: 0 20px;
          font-size: 13px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          border-right: 1px solid var(--border);
          color: var(--text-secondary);
        }
        .timeline-bar-wrapper {
          flex: 1;
          position: relative;
          height: 100%;
        }
        .timeline-bar {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          height: 8px;
          border-radius: 4px;
          background: var(--accent);
          box-shadow: 0 0 15px rgba(var(--accent-rgb), 0.3);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .timeline-bar.is-active {
          height: 12px;
          background: linear-gradient(90deg, var(--accent), var(--accent-light));
          box-shadow: 0 0 25px rgba(var(--accent-rgb), 0.5);
        }
        .timeline-bar.level-1 { background: linear-gradient(90deg, #6366f1, #818cf8); }
        .timeline-bar.level-2 { background: linear-gradient(90deg, #8b5cf6, #a78bfa); }
        .timeline-bar.level-3 { background: linear-gradient(90deg, #ec4899, #f472b6); }
        .timeline-bar.level-4 { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
        
        @keyframes pulse-lite {
          0% { opacity: 0.6; }
          50% { opacity: 1; transform: translateY(-50%) scaleX(1.02); }
          100% { opacity: 0.6; }
        }
        .timeline-bar.is-switching {
          animation: pulse-lite 1s infinite ease-in-out;
        }
      `}</style>

      <div className="timeline-axis" style={{ width: totalWidth }}>
        {['Jan 24', 'Feb 24', 'Mar 24', 'Apr 24', 'May 24', 'Jun 24'].map(m => (
          <div key={m} className="axis-point">{m}</div>
        ))}
      </div>
      
      <div className="timeline-content" style={{ width: totalWidth }}>
        {localBranches.map((b, i) => (
          <div 
            key={b.name} 
            className="timeline-row"
            onClick={() => !b.current && !loading[b.name] && onSwitch(b.name)}
          >
            <div className="timeline-branch-label">
              <span className={b.current ? 'text-primary' : ''} style={{ 
                fontWeight: b.current ? 700 : 400,
                color: b.current ? 'var(--accent-light)' : 'inherit'
              }}>
                {loading[b.name] === 'switch' ? '⚡ ' : ''}{b.name}
              </span>
            </div>
            <div className="timeline-bar-wrapper">
              <div 
                className={`timeline-bar level-${(i % 4) + 1} ${b.current ? 'is-active' : ''} ${loading[b.name] === 'switch' ? 'is-switching' : ''}`}
                style={{ 
                  left: `${50 + (i % 5) * 120}px`, 
                  width: `${150 + (i % 3) * 60}px`,
                }}
              >
                {b.current && <div className="bar-glow" style={{
                  position: 'absolute',
                  inset: -2,
                  borderRadius: 6,
                  background: 'inherit',
                  filter: 'blur(8px)',
                  opacity: 0.5,
                  zIndex: -1
                }} />}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BranchGraphView({ branches, onSwitch, loading, isLite }) {
  const localBranches = isLite ? branches : branches.filter(b => !b.remote);
  const totalWidth = Math.max(800, 200 + localBranches.length * 150);
  
  return (
    <div className="graph-view-container" style={{ overflowX: 'auto', paddingBottom: 20 }}>
      <svg width={totalWidth} height="400" viewBox={`0 0 ${totalWidth} 400`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Main Trunk */}
        <line x1="0" y1="200" x2={totalWidth} y2="200" stroke="rgba(255,255,255,0.05)" strokeWidth="3" strokeDasharray="8 8" />
        
        {localBranches.length === 0 && (
          <text x="300" y="200" textAnchor="middle" fill="var(--text-muted)" style={{ fontSize: 14 }}>
            No branches to visualize
          </text>
        )}
        {localBranches.map((b, i) => {
          const x = 150 + i * 150;
          const y = b.current ? 200 : (200 + (i % 2 === 0 ? -100 : 100));
          
          return (
            <g 
              key={b.name} 
              className="graph-node-group"
              onClick={() => !b.current && !loading[b.name] && onSwitch(b.name)}
            >
              {/* Curve from trunk */}
              {!b.current && (
                <path 
                  d={`M ${x-60} 200 Q ${x-30} ${y}, ${x} ${y}`} 
                  stroke={loading[b.name] === 'switch' ? "var(--accent)" : "rgba(255,255,255,0.15)"} 
                  fill="none" 
                  strokeWidth="2" 
                />
              )}
              
              {/* Node */}
              <circle 
                cx={x} cy={y} r={b.current ? 10 : 7} 
                fill={b.current ? "var(--accent)" : "var(--bg-card)"}
                stroke={b.current ? "var(--accent-light)" : "var(--border)"}
                strokeWidth="2.5"
                filter={b.current ? "url(#glow)" : ""}
              />
              
              {/* Label */}
              <text 
                x={x} y={y + (y > 200 ? 30 : -20)} 
                textAnchor="middle" 
                fill={b.current ? "white" : "var(--text-muted)"}
                style={{ fontSize: 13, fontWeight: b.current ? 700 : 500 }}
              >
                {loading[b.name] === 'switch' ? '⌛ ...' : b.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function BranchPanel({ projectId, toast, onRefresh }) {
  const [branches, setBranches] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newBranch, setNewBranch] = useState('');
  const [loading, setLoading] = useState({});
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem(`branchView_${projectId}`) || null;
  });

  useEffect(() => {
    gitApi.branches(projectId).then(setBranches).catch(() => {});
  }, [projectId]);

  // Reset view mode when project changes if not persistent
  useEffect(() => {
    const saved = localStorage.getItem(`branchView_${projectId}`);
    setViewMode(saved);
  }, [projectId]);

  const saveViewMode = (mode) => {
    setViewMode(mode);
    if (mode) {
      localStorage.setItem(`branchView_${projectId}`, mode);
    } else {
      localStorage.removeItem(`branchView_${projectId}`);
    }
  };

  async function handleCreate(e) {
    e.preventDefault();
    if (!newBranch.trim()) return;
    setLoading(l => ({ ...l, create: true }));
    try {
      await gitApi.createBranch(projectId, newBranch.trim());
      toast(`Branch '${newBranch}' created`, 'success');
      setNewBranch('');
      setShowCreate(false);
      const b = await gitApi.branches(projectId);
      setBranches(b);
      onRefresh();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(l => ({ ...l, create: false }));
    }
  }

  async function handleSwitch(name) {
    setLoading(l => ({ ...l, [name]: 'switch' }));
    try {
      await gitApi.switchBranch(projectId, name);
      toast(`Switched to '${name}'`, 'success');
      const b = await gitApi.branches(projectId);
      setBranches(b);
      onRefresh();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(l => ({ ...l, [name]: false }));
    }
  }

  async function handleDelete(name) {
    if (!confirm(`Delete branch '${name}'?`)) return;
    setLoading(l => ({ ...l, [name]: 'delete' }));
    try {
      await gitApi.deleteBranch(projectId, name);
      toast(`Branch '${name}' deleted`, 'info');
      const b = await gitApi.branches(projectId);
      setBranches(b);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(l => ({ ...l, [name]: false }));
    }
  }

  if (!branches) return <div className="loading-state"><div className="spinner" /></div>;
  
  const isLite = branches.isLite;
  const localBranches = isLite ? branches.branches : branches.branches.filter(b => !b.remote);

  return (
    <div style={{ position: 'relative', minHeight: '300px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {localBranches.length}{isLite ? ' upstream branches (API)' : ' local branches'}
          </span>
          <button 
            className="btn btn-ghost btn-xs" 
            onClick={() => saveViewMode(null)}
            title="Switch visualization mode"
          >
            <Layout size={12} />
          </button>
        </div>
        <button 
          className="btn btn-primary btn-sm" 
          onClick={() => setShowCreate(v => !v)}
          disabled={isLite}
          title={isLite ? "Branch creation is disabled in Lite Mode" : "Create branch"}
        >
          {isLite ? 'Read-Only' : '+ New Branch'}
        </button>
      </div>

      {isLite && (
        <div className="alert-premium" style={{ marginBottom: 16, padding: '10px 16px', fontSize: 11 }}>
          <Radio size={12} style={{ marginRight: 8, color: 'var(--accent)' }} />
          Showing remote branches directly from GitHub API. Read-only tracking mode.
        </div>
      )}

      {showCreate && (
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            id="new-branch-name"
            className="input mono-input"
            placeholder="feature/my-feature"
            value={newBranch}
            onChange={e => setNewBranch(e.target.value)}
            autoFocus
          />
          <button
            type="submit"
            className={`btn btn-primary btn-sm${loading.create ? ' btn-loading' : ''}`}
            disabled={loading.create}
          >
            {loading.create ? '' : 'Create'}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}>✕</button>
        </form>
      )}

      {/* VIEW MODES */}
      {!viewMode && (
        <BranchViewSelector 
          onSelect={saveViewMode} 
          onSkip={() => saveViewMode('list')} 
        />
      )}

      {viewMode === 'list' && (
        <div className="branch-list-fade-in">
          {localBranches.map(b => (
            <div key={b.name} className={`branch-item${b.current ? ' current' : ''}`}>
              <div className="branch-dot" />
              <span className="branch-name">{b.name}</span>
              {b.current && <span className="badge badge-green" style={{ fontSize: 9 }}>current</span>}
              <div className="branch-actions">
                {!b.current && !isLite && (
                  <>
                    <button
                      className={`btn btn-secondary btn-xs${loading[b.name] === 'switch' ? ' btn-loading' : ''}`}
                      disabled={!!loading[b.name]}
                      onClick={() => handleSwitch(b.name)}
                    >
                      Switch
                    </button>
                    <button
                      className="btn btn-danger btn-xs"
                      disabled={!!loading[b.name]}
                      onClick={() => handleDelete(b.name)}
                    >
                      ✕
                    </button>
                  </>
                )}
                {isLite && (
                   <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Upstream</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {viewMode === 'timeline' && (
        <BranchTimelineView 
          branches={branches.branches} 
          onSwitch={handleSwitch}
          loading={loading}
          isLite={isLite}
        />
      )}
      {viewMode === 'graph' && (
        <BranchGraphView 
          branches={branches.branches} 
          onSwitch={handleSwitch}
          loading={loading}
          isLite={isLite}
        />
      )}
    </div>
  );
}

function StashPanel({ projectId, toast }) {
  const [stashes, setStashes] = useState([]);
  const [stashMsg, setStashMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    gitApi.stashList(projectId).then(setStashes).catch(() => setStashes([]));
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  async function handlePush() {
    setLoading(true);
    try {
      await gitApi.stashPush(projectId, stashMsg);
      setStashMsg('');
      toast('Changes stashed', 'success');
      load();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handlePop(index) {
    try {
      await gitApi.stashPop(projectId, index);
      toast('Stash applied', 'success');
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function handleDrop(index) {
    if (!confirm('Drop this stash?')) return;
    try {
      await gitApi.stashDrop(projectId, index);
      toast('Stash dropped', 'info');
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          className="input"
          placeholder="Stash message (optional)"
          value={stashMsg}
          onChange={e => setStashMsg(e.target.value)}
        />
        <button
          className={`btn btn-primary btn-sm${loading ? ' btn-loading' : ''}`}
          onClick={handlePush}
          disabled={loading}
        >
          {loading ? '' : '⬆ Stash'}
        </button>
      </div>

      {stashes.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
          No stashes
        </div>
      ) : stashes.map(s => (
        <div key={s.index} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 10px', borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)', marginBottom: 6,
        }}>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: 'var(--accent-light)', background: 'var(--accent-dim)', padding: '1px 6px', borderRadius: 4 }}>
            {s.index}
          </span>
          <span style={{ flex: 1, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.message}</span>
          <button className="btn btn-success btn-xs" onClick={() => handlePop(s.index)}>Pop</button>
          <button className="btn btn-danger btn-xs" onClick={() => handleDrop(s.index)}>✕</button>
        </div>
      ))}
    </div>
  );
}

// ── Main GitPanel ─────────────────────────────────────────────

export default function GitPanel() {
  const { projects, selectedProjectId, dispatch, toast } = useApp();
  const navigate = useNavigate();

  const [status, setStatus] = useState(null);
  const [log, setLog] = useState([]);
  const [diff, setDiff] = useState(null);
  const [diffFile, setDiffFile] = useState('');
  const [commitMsg, setCommitMsg] = useState('');
  const [tab, setTab] = useState('changes'); // changes | log | branches | stash
  const [loading, setLoading] = useState({});
  const [statusLoading, setStatusLoading] = useState(false);

  const project = projects.find(p => p.id === selectedProjectId) || null;

  // Set default tab to log for lite projects
  useEffect(() => {
    if (project?.isLite) {
      setTab('log');
    } else {
      setTab('changes');
    }
  }, [selectedProjectId, project?.isLite]);

  const refreshStatus = useCallback(async () => {
    if (!selectedProjectId) return;
    setStatusLoading(true);
    try {
      const s = await gitApi.status(selectedProjectId);
      setStatus(s);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setStatusLoading(false);
    }
  }, [selectedProjectId]);

  const refreshLog = useCallback(async () => {
    if (!selectedProjectId) return;
    try {
      const l = await gitApi.log(selectedProjectId, 30);
      setLog(l);
    } catch {}
  }, [selectedProjectId]);

  useEffect(() => {
    refreshStatus();
    refreshLog();
  }, [selectedProjectId]);

  async function handleStage(file) {
    try {
      await gitApi.stage(selectedProjectId, [file]);
      await refreshStatus();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function handleStageAll() {
    try {
      await gitApi.stageAll(selectedProjectId);
      await refreshStatus();
      toast('All files staged', 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function handleUnstage(file) {
    try {
      await gitApi.unstage(selectedProjectId, [file]);
      await refreshStatus();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function handleCommit() {
    if (!commitMsg.trim()) { toast('Commit message required', 'warning'); return; }
    if (!status?.staged?.length) { toast('No staged changes', 'warning'); return; }
    setLoading(l => ({ ...l, commit: true }));
    try {
      await gitApi.commit(selectedProjectId, commitMsg);
      setCommitMsg('');
      toast(`Committed: "${commitMsg}"`, 'success');
      await refreshStatus();
      await refreshLog();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(l => ({ ...l, commit: false }));
    }
  }

  async function handlePush() {
    setLoading(l => ({ ...l, push: true }));
    try {
      const r = await gitApi.push(selectedProjectId);
      toast(`Pushed to ${r.pushed}`, 'success');
      await refreshStatus();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(l => ({ ...l, push: false }));
    }
  }

  async function handlePull() {
    setLoading(l => ({ ...l, pull: true }));
    try {
      await gitApi.pull(selectedProjectId);
      toast('Pulled from remote', 'success');
      await refreshStatus();
      await refreshLog();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(l => ({ ...l, pull: false }));
    }
  }

  async function handleFetch() {
    setLoading(l => ({ ...l, fetch: true }));
    try {
      await gitApi.fetch(selectedProjectId);
      toast('Fetched all remotes', 'success');
      await refreshStatus();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(l => ({ ...l, fetch: false }));
    }
  }

  async function handleDiff(file, staged = false) {
    try {
      const cleanFile = file.replace(/^["']|["']$/g, '').trim();
      const result = await gitApi.diff(selectedProjectId, cleanFile, staged);
      setDiffFile(cleanFile);
      setDiff(result.diff || '(No diff available)');
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  // No project selected
  if (!selectedProjectId) {
    return (
      <div className="page-content">
        <div className="empty-state" style={{ height: '60vh' }}>
          <span className="empty-state-icon">⑂</span>
          <div className="empty-state-title">No project selected</div>
          <div className="empty-state-desc">Select a project from the sidebar or the Projects page.</div>
          <button className="btn btn-primary" onClick={() => navigate('/projects')}>Go to Projects</button>
        </div>
      </div>
    );
  }

  const allUnstaged = [
    ...(status?.modified || []).map(f => `M ${f}`),
    ...(status?.not_added || []).map(f => `? ${f}`),
    ...(status?.deleted || []).map(f => `D ${f}`),
  ];
  const allStaged = (status?.staged || []).map(f => `A ${f}`);

  return (
    <div className="page-content" style={{ display: 'flex', gap: 20, height: '100%', paddingBottom: 0 }}>

      {/* Left — Changes + Commit */}
      <div style={{ width: 300, display: 'flex', flexDirection: 'column', gap: 14, flexShrink: 0 }}>

        {/* Project Selector */}
        <div className="card" style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>ACTIVE PROJECT</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{
              width: 24, height: 24, borderRadius: 6, flexShrink: 0,
              background: 'var(--bg-secondary)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, overflow: 'hidden'
            }}>
              {project?.logo ? (
                <img src={`http://127.0.0.1:3001${project.logo}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                project?.icon || '📁'
              )}
            </div>
            <span style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>{project?.name}</span>
            {statusLoading && <div className="spinner" />}
          </div>
          {status?.current && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span className="badge badge-purple" style={{ fontFamily: 'JetBrains Mono' }}>⑂ {status.current}</span>
              {project?.isLite ? (
                <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#fff' }}>LITE MODE</span>
              ) : (
                <>
                  {status.ahead > 0  && <span className="badge badge-green">↑ {status.ahead} ahead</span>}
                  {status.behind > 0 && <span className="badge badge-blue">↓ {status.behind} behind</span>}
                  {status.isClean   && <span className="badge badge-gray">✓ Clean</span>}
                </>
              )}
            </div>
          )}
          {!project?.isLite && (
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <button
                id="git-pull"
                className={`btn btn-secondary btn-sm${loading.pull ? ' btn-loading' : ''}`}
                onClick={handlePull}
                disabled={!!loading.pull}
                style={{ flex: 1 }}
              >
                {loading.pull ? '' : '⬇ Pull'}
              </button>
              <button
                id="git-fetch"
                className={`btn btn-ghost btn-sm${loading.fetch ? ' btn-loading' : ''}`}
                onClick={handleFetch}
                disabled={!!loading.fetch}
              >
                {loading.fetch ? '' : '↻ Fetch'}
              </button>
            </div>
          )}
          {project?.isLite && (
            <div style={{ marginTop: 12, fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <ExternalLink size={10} />
              <a href={project.repoUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>View on GitHub</a>
            </div>
          )}
        </div>

        {/* Project switcher */}
        {projects.length > 1 && (
          <div className="form-group">
            <select
              id="project-switcher"
              className="select"
              value={selectedProjectId || ''}
              onChange={e => dispatch({ type: 'SELECT_PROJECT', payload: e.target.value })}
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Content based on Lite vs Full */}
        {project?.isLite ? (
          <div className="card" style={{ padding: '20px', textAlign: 'center', border: '1px dashed var(--accent)', background: 'rgba(var(--accent-rgb), 0.03)' }}>
            <Radio size={32} style={{ color: 'var(--accent)', marginBottom: 16, opacity: 0.6 }} />
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#fff' }}>Lite Track Mode</h3>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 16 }}>
              This repository is being monitored via API. No local files are used, saving disk space.
            </p>
            <div style={{ paddingTop: 16, borderTop: '1px solid var(--border)', fontSize: 10, color: 'var(--text-secondary)' }}>
               Read-only view of upstream branches and commits.
            </div>
          </div>
        ) : (
          <>
            {/* Staged files */}
            <div className="card" style={{ padding: '14px', flex: '0 0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Staged ({allStaged.length})
                </span>
              </div>
              {allStaged.length === 0 ? (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>
                  No staged files
                </div>
              ) : (
                <div style={{ maxHeight: 120, overflowY: 'auto' }}>
                  {allStaged.map(f => (
                    <FileRow
                      key={f}
                      file={f.slice(2)}
                      type="staged"
                      onUnstage={handleUnstage}
                      onDiff={(file) => handleDiff(file, true)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Unstaged files */}
            <div className="card" style={{ padding: '14px', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Unstaged ({allUnstaged.length})
                </span>
                {allUnstaged.length > 0 && (
                  <button className="btn btn-success btn-xs" onClick={handleStageAll}>
                    Stage All
                  </button>
                )}
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {allUnstaged.length === 0 ? (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>
                    No changes
                  </div>
                ) : allUnstaged.map(f => (
                  <FileRow
                    key={f}
                    file={f.slice(2)}
                    type="unstaged"
                    onStage={handleStage}
                    onDiff={handleDiff}
                  />
                ))}
              </div>
            </div>

            {/* Commit box */}
            <div className="card" style={{ padding: '14px' }}>
              <textarea
                id="commit-message"
                className="textarea"
                placeholder="Commit message…"
                value={commitMsg}
                onChange={e => setCommitMsg(e.target.value)}
                style={{ minHeight: 72, marginBottom: 10 }}
                onKeyDown={e => {
                  if (e.ctrlKey && e.key === 'Enter') handleCommit();
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  id="git-commit"
                  className={`btn btn-primary${loading.commit ? ' btn-loading' : ''}`}
                  style={{ flex: 1 }}
                  onClick={handleCommit}
                  disabled={!!loading.commit || status?.followOnly}
                >
                  {loading.commit ? '' : '✓ Commit'}
                </button>
                {!status?.followOnly && (
                  <button
                    id="git-push"
                    className={`btn btn-secondary${loading.push ? ' btn-loading' : ''}`}
                    onClick={handlePush}
                    disabled={!!loading.push}
                    title="Push to remote"
                  >
                    {loading.push ? '' : '↑'}
                  </button>
                )}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6, textAlign: 'center' }}>
                Ctrl+Enter to commit
              </div>
            </div>
          </>
        )}
      </div>

      {/* Right — tabs */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div className="tabs" style={{ marginBottom: 16 }}>
          {(project?.isLite ? [
            { id: 'log',      label: '📜 Commit Log' },
            { id: 'branches', label: '⑂ Branches' }
          ] : [
            { id: 'changes',  label: '📝 Changes' },
            { id: 'log',      label: '📜 Commit Log' },
            { id: 'branches', label: '⑂ Branches' },
            { id: 'stash',    label: '📦 Stash' }
          ]).map(t => (
            <button
              key={t.id}
              id={`tab-${t.id}`}
              className={`tab${tab === t.id ? ' active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="card" style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>

          {/* Changes tab */}
          {tab === 'changes' && !project?.isLite && (
            <div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                Select files on the left to stage/unstage them. Click any file to view its diff.
              </div>
              {status?.conflicted?.length > 0 && (
                <div style={{
                  background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 16,
                }}>
                  <div style={{ fontWeight: 600, color: 'var(--red)', marginBottom: 4 }}>⚠ Merge Conflicts</div>
                  {status.conflicted.map(f => (
                    <div key={f} style={{ fontSize: 12, fontFamily: 'JetBrains Mono', color: 'var(--red)' }}>{f}</div>
                  ))}
                </div>
              )}
              {status?.isClean && (
                <div className="empty-state" style={{ padding: '40px 0' }}>
                  <span style={{ fontSize: 40 }}>✓</span>
                  <div className="empty-state-title" style={{ color: 'var(--green)' }}>Nothing to commit</div>
                  <div className="empty-state-desc">Working tree is clean.</div>
                </div>
              )}
            </div>
          )}

          {/* Log tab */}
          {tab === 'log' && (
            <div className="commit-timeline" style={{ position: 'relative', paddingLeft: 10, paddingTop: 10 }}>
              <style>{`
                .timeline-line {
                  position: absolute;
                  left: 107px;
                  top: 0;
                  bottom: 0;
                  width: 2px;
                  background: linear-gradient(180deg, var(--border) 0%, rgba(255,255,255,0.05) 100%);
                  z-index: 1;
                }
                .timeline-item {
                  display: flex;
                  gap: 24px;
                  margin-bottom: 24px;
                  position: relative;
                  z-index: 2;
                }
                .timeline-time {
                  width: 80px;
                  text-align: right;
                  font-size: 11px;
                  font-weight: 600;
                  color: var(--text-muted);
                  padding-top: 10px;
                  font-family: 'JetBrains Mono', monospace;
                }
                .timeline-node {
                  width: 32px;
                  height: 32px;
                  border-radius: 50%;
                  background: var(--bg-card);
                  border: 2px solid var(--border);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  flex-shrink: 0;
                  color: white;
                  box-shadow: 0 0 15px rgba(0,0,0,0.2);
                  transition: all 0.3s;
                }
                .timeline-item:hover .timeline-node {
                  transform: scale(1.1);
                  border-color: var(--accent);
                  box-shadow: 0 0 20px rgba(var(--accent-rgb), 0.3);
                }
                .timeline-card {
                  flex: 1;
                  background: rgba(255, 255, 255, 0.03);
                  border: 1px solid var(--border);
                  border-radius: 12px;
                  padding: 14px 18px;
                  transition: all 0.3s;
                  backdrop-filter: blur(8px);
                }
                .timeline-item:hover .timeline-card {
                  background: rgba(255, 255, 255, 0.05);
                  border-color: var(--border-hover);
                  transform: translateX(4px);
                }
                .timeline-msg {
                  font-size: 14px;
                  font-weight: 500;
                  color: var(--text-main);
                  margin-bottom: 6px;
                  line-height: 1.4;
                }
                .timeline-meta {
                  display: flex;
                  align-items: center;
                  gap: 12px;
                  font-size: 11px;
                  color: var(--text-muted);
                }
                .timeline-hash {
                  font-family: 'JetBrains Mono', monospace;
                  opacity: 0.6;
                }
                .timeline-author {
                  font-weight: 600;
                  color: var(--text-secondary);
                }
              `}</style>

              <div className="timeline-line" />

              {log.length === 0 ? (
                <div className="loading-state"><div className="spinner" /></div>
              ) : log.map(c => {
                const { icon, color } = getCommitIcon(c.message);
                const date = new Date(c.date);
                const dateStr = date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
                const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                
                return (
                  <div key={c.hash} className="timeline-item">
                    <div className="timeline-time" style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                      <span style={{ fontSize: 9, opacity: 0.5 }}>{dateStr}</span>
                      <span>{timeStr}</span>
                    </div>
                    <div className="timeline-node" style={{ backgroundColor: color, borderColor: color }}>
                      {icon}
                    </div>
                    <div className="timeline-card">
                      <div className="timeline-msg">{c.message}</div>
                      <div className="timeline-meta">
                        <span className="timeline-author">{c.author_name}</span>
                        <span>·</span>
                        <span className="timeline-hash">{c.hashShort}</span>
                        {c.refs && (
                          <span className="badge badge-purple" style={{ fontSize: 9, padding: '2px 8px' }}>
                            {c.refs.split(',')[0].trim()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Branches tab */}
          {tab === 'branches' && (
            <BranchPanel
              projectId={selectedProjectId}
              toast={toast}
              onRefresh={refreshStatus}
            />
          )}

          {/* Stash tab */}
          {tab === 'stash' && (
            <StashPanel projectId={selectedProjectId} toast={toast} />
          )}
        </div>
      </div>

      {/* Diff Modal */}
      {diff !== null && (
        <DiffPanel
          diff={diff}
          file={diffFile}
          onClose={() => { setDiff(null); setDiffFile(''); }}
        />
      )}
    </div>
  );
}
