import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderGit2,
  GitBranch,
  Settings,
  Search,
  ChevronDown,
  Zap,
  Plus,
  BarChart3,
  Layers,
  Users,
  Grid,
  Radio,
  CalendarDays
} from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';

export default function Sidebar() {
  const { projects, ghUser, ghConnected, selectedProjectId, dispatch } = useApp();
  const navigate = useNavigate();

  const changedCount = projects.filter(p => p.hasChanges).length;

  function handleProjectClick(p) {
    dispatch({ type: 'SELECT_PROJECT', payload: p.id });
    navigate('/git');
  }

  return (
    <aside className="sidebar">
      {/* Workspace Switcher */}
      <div className="workspace-switcher">
        <div className="workspace-icon">
          <img src="../../src/assets/logo.png" height="80px" width="80px" />
        </div>
        <span className="workspace-name">MegaHubGit</span>
      </div>

      {/* Search */}
      <div className="sidebar-search">
        <div className="search-input-wrapper">
          <Search size={14} className="search-icon" />
          <input type="text" className="search-input" placeholder="Search" />
          <span className="search-shorthand">/</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        <div className="sidebar-section-label">General</div>

        <NavLink to="/" end className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}>
          <LayoutDashboard className="sidebar-item-icon" size={18} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink to="/projects" className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}>
          <FolderGit2 className="sidebar-item-icon" size={18} />
          <span>Projects</span>
          {projects.filter(p => !p.followOnly).length > 0 && (
            <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)' }}>{projects.filter(p => !p.followOnly).length}</span>
          )}
        </NavLink>

        <NavLink to="/following" className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}>
          <Radio className="sidebar-item-icon" size={18} />
          <span>Following</span>
          {projects.filter(p => p.followOnly).length > 0 && (
            <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--accent)' }}>{projects.filter(p => p.followOnly).length}</span>
          )}
        </NavLink>

        <NavLink to="/git" className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}>
          <GitBranch className="sidebar-item-icon" size={18} />
          <span>Git Panel</span>
          {changedCount > 0 && (
            <span style={{ marginLeft: 'auto', color: 'var(--yellow)', fontSize: 10 }}>{changedCount}</span>
          )}
        </NavLink>

        <div className="sidebar-section-label">Features</div>

        <div className="sidebar-item">
          <BarChart3 className="sidebar-item-icon" size={18} />
          <span>Analytics</span>
        </div>

        <NavLink to="/planner" className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}>
          <CalendarDays className="sidebar-item-icon" size={18} />
          <span>Planner</span>
        </NavLink>

        <div className="sidebar-item">
          <Users className="sidebar-item-icon" size={18} />
          <span>Contributers</span>
        </div>
        <div className="sidebar-item">
          <Grid className="sidebar-item-icon" size={18} />
          <span>Apps</span>
        </div>

        <div className="sidebar-section-label">Local Folders</div>
        {projects.slice(0, 6).map(p => (
          <div
            key={p.id}
            className={`sidebar-item${selectedProjectId === p.id ? ' active' : ''}`}
            onClick={() => handleProjectClick(p)}
            style={{ position: 'relative' }}
          >
            <div className="sidebar-project-icon">
              {p.logo ? (
                <img src={`http://127.0.0.1:3001${p.logo}`} alt="" />
              ) : (
                <span style={{ fontSize: 12 }}>{p.icon || '📁'}</span>
              )}
              {p.hasChanges && <div className="sidebar-status-dot" />}
            </div>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.name}
            </span>
          </div>
        ))}
        <div className="sidebar-item" style={{ color: 'var(--text-muted)' }} onClick={() => navigate('/projects')}>
          <Plus size={14} />
          <span>Check all repos</span>
        </div>
      </nav>

      <NavLink to="/settings" end className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}>
        <Settings className="sidebar-item-icon" size={18} />
        <span>Settings</span>
      </NavLink>

    </aside>
  );
}
