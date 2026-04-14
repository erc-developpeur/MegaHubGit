import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Briefcase, 
  Clock, 
  AlertCircle, 
  Settings, 
  Folder, 
  Share2, 
  Edit2, 
  Activity, 
  GitBranch, 
  Star,
  Users,
  Search,
  ArrowUpRight,
  MoreVertical
} from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { githubApi } from '../api/index.js';

function PremiumStatCard({ label, value, icon: Icon, subText }) {
  return (
    <div className="stat-card-premium">
      <div className="stat-card-info">
        <span className="stat-card-label">{label}</span>
        <div className="stat-card-value">{value ?? '0'}</div>
      </div>
      <div className="stat-card-icon-box">
        <Icon size={24} />
      </div>
    </div>
  );
}

function FolderCard({ project, onClick }) {
  return (
    <div className="folder-card" onClick={onClick} style={{ cursor: 'pointer' }}>
      <div className="folder-card-icon-area">
        {project.logo ? (
          <img 
            src={`http://127.0.0.1:3001${project.logo}`} 
            alt="" 
            style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '8px' }} 
          />
        ) : (
          <Folder size={32} className="text-secondary" />
        )}
        <div style={{ position: 'absolute', top: 12, right: 12 }}>
          <div className="avatar-stack">
            <div className="avatar-stack-item">JD</div>
            <div className="avatar-stack-item" style={{ background: '#3b82f6' }}>SC</div>
            <div className="avatar-stack-item">2+</div>
          </div>
        </div>
      </div>
      
      <div className="folder-card-meta">
        <span className="folder-card-count">{project.branch || 'main'}</span>
        {project.hasChanges && <div className="status-dot yellow" />}
      </div>

      <div className="folder-card-title">{project.name}</div>
      <div className="folder-card-desc">
        {project.path 
          ? `${project.path.split('\\').pop().split('/').pop()} repository tracking.`
          : 'GitHub API remote tracking.'
        }
      </div>

      <div className="folder-card-actions">
        <div className="folder-action-btn">
          <Share2 className="folder-action-icon" />
          <span>Share</span>
        </div>
        <div className="folder-action-btn">
          <Edit2 className="folder-action-icon" />
          <span>Edit</span>
        </div>
        <div className="folder-action-btn" style={{ marginLeft: 'auto' }}>
          <MoreVertical className="folder-action-icon" />
        </div>
      </div>
    </div>
  );
}

function ActivityHeatmap() {
  const { ghConnected } = useApp();
  const [activeTab, setActiveTab] = useState('Week');
  const [loading, setLoading] = useState(false);
  const [ghStats, setGhStats] = useState(null);
  const [ghActivityData, setGhActivityData] = useState([]);
  const [tooltip, setTooltip] = useState({ 
    visible: false, x: 0, y: 0, date: '', count: 0, repos: [] 
  });

  // Fetch activity data for tooltip correlation
  useEffect(() => {
    if (ghConnected) {
      githubApi.activity()
        .then(res => setGhActivityData(res))
        .catch(err => console.error("Failed to fetch activity:", err));
    }
  }, [ghConnected]);

  // Fetch real data if connected
  useEffect(() => {
    if (ghConnected) {
      setLoading(true);
      githubApi.stats()
        .then(res => setGhStats(res))
        .catch(err => console.error('Failed to fetch GH stats:', err))
        .finally(() => setLoading(false));
    }
  }, [ghConnected]);

  // Categories config
  const config = {
    'Week':    { weeks: 15, label: 'Last 15 weeks' },
    'Month':   { weeks: 5,  label: 'Last month' },
    'Quarter': { weeks: 12, label: 'Last quarter' },
    'Year':    { weeks: 52, label: 'Full year' },
    'All':     { weeks: 60, label: 'Total history' }
  };

  const current = config[activeTab] || config['Week'];

  // Data mapping logic
  const levels = React.useMemo(() => {
    // Determine how many days we need to show
    let todayDayOfWeek = (new Date().getDay() + 6) % 7; // Default to actual today
    
    if (ghConnected && ghStats?.dailyCounts && ghStats.dailyCounts.length > 0) {
      const lastDate = new Date(ghStats.dailyCounts[ghStats.dailyCounts.length - 1].date);
      todayDayOfWeek = (lastDate.getDay() + 6) % 7;
    }
    
    const totalDaysNeeded = (current.weeks - 1) * 7 + (todayDayOfWeek + 1);

    
    // SPECIAL LOGIC FOR "DAY" VIEW (HOURLY SLOTS)
    if (activeTab === 'Day') {
      const slots = 7;
      const data = [];
      // Use the user's REAL total or a fixed seed to make it stable
      const seed = ghStats?.total || 42; 
      // slots: 00-04, 04-08, 08-11, 11-14, 14-17, 17-21, 21-00
      const weights = [1, 0, 3, 2, 4, 3, 2]; 
      
      for (let i = 0; i < slots; i++) {
        // Deterministic variation based on seed and index
        const variance = (seed + i) % 2; 
        const level = Math.min(4, weights[i] + variance);
        const scale = ghStats?.total > 100 ? 1 : 0.7;
        data.push({ date: new Date().toISOString().split('T')[0], level: Math.round(level * scale), count: Math.round(level * scale) });
      }
      return data;
    }
    
    // REAL DATA FROM GITHUB
    if (ghConnected && ghStats?.dailyCounts) {
      // GitHub data includes future days until the end of the week.
      // We identify "Today" and stop there.
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const daily = ghStats.dailyCounts;
      
      // We need to slice exactly 'totalDaysNeeded' ending at Today
      // Robust calculation: Find exact match for today, or fallback to the end of the array
      let todayIdx = daily.findIndex(d => d.date === todayStr);
      
      // If no exact match (timezone shift), find the first element that is at least today
      if (todayIdx === -1) {
        todayIdx = daily.findIndex(d => d.date > todayStr);
      }
      
      // If still not found, it means Today is the last element or beyond
      const endIdx = (todayIdx !== -1 && todayIdx > 0) ? todayIdx : daily.length - 1;
      
      const realSlice = daily.slice(Math.max(0, endIdx - totalDaysNeeded + 1), endIdx + 1);
      
      // If we don't have enough days, pad the start with empty ones
      const padded = [];
      if (realSlice.length < totalDaysNeeded) {
        const firstDate = new Date(realSlice[0]?.date || todayStr);
        for (let i = 0; i < (totalDaysNeeded - realSlice.length); i++) {
           const d = new Date(firstDate);
           d.setDate(d.getDate() - (totalDaysNeeded - realSlice.length - i));
           padded.push({ date: d.toISOString().split('T')[0], level: 0, count: 0 });
        }
      }

      return [...padded, ...realSlice.map(d => ({
        date: d.date,
        level: d.level,
        count: d.count
      }))];
    }
    
    // FALLBACK TO DETERMINISTIC SIMULATED DAILY DATA
    const data = [];
    const baseSeed = 12345;
    const now = new Date();
    
    for (let i = 0; i < totalDaysNeeded; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - (totalDaysNeeded - 1 - i));
        const dateStr = d.toISOString().split('T')[0];
        const dayIndex = 500 - (totalDaysNeeded - i); 
        const val = (dayIndex * baseSeed) % 101;
        const dayOfWeek = d.getDay(); 
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        
        let level = 0;
        if (val > (isWeekend ? 94 : 78)) {
           level = Math.floor((val % 4)) + 1;
        }
        data.push({ date: dateStr, level, count: level * 2 });
    }
    return data;
  }, [activeTab, current.weeks, ghStats, ghConnected]);

  const handleMouseEnter = (dataItem, i, e) => {
    const { date, count } = dataItem;
    const dateStr = date;
    let reposData = [];

    const matches = ghActivityData.filter(evt => {
       const evtDate = new Date(evt.created_at).toISOString().split('T')[0];
       return evtDate === dateStr;
    });

    // Group activities by repo and list action types
    const grouped = matches.reduce((acc, evt) => {
      const repoName = evt.repo || 'unknown';
      if (!acc[repoName]) acc[repoName] = new Set();
      acc[repoName].add(evt.type.replace('Event', ''));
      return acc;
    }, {});

    reposData = Object.entries(grouped).map(([name, types]) => ({
      name,
      actions: Array.from(types)
    }));

    setTooltip({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      date: new Date(dateStr).toLocaleDateString(undefined, { 
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' 
      }),
      count: count,
      repos: reposData
    });
  };

  const handleMouseMove = (e) => {
    setTooltip(prev => ({ ...prev, x: e.clientX, y: e.clientY }));
  };

  const handleMouseLeave = () => {
    setTooltip(prev => ({ ...prev, visible: false }));
  };

  // Derived stats from levels
  const stats = React.useMemo(() => {
    if (!levels.length) return { min: 0, avg: 0, max: 0, total: 0 };
    const max = Math.max(...levels.map(l => l.level));
    const total = ghConnected && ghStats && activeTab === 'Year' ? ghStats.total : levels.reduce((a, b) => a + (b.count), 0);
    const avg = Math.round(total / (levels.length || 1)) || 0;
    return { avg, max, total };
  }, [levels, ghConnected, ghStats, activeTab]);

  // Visual loading state
  useEffect(() => {
    if (!ghConnected) {
      setLoading(true);
      const t = setTimeout(() => setLoading(false), 250);
      return () => clearTimeout(t);
    }
  }, [activeTab, ghConnected]);

  const tabs = ['Week', 'Month', 'Quarter', 'Year', 'All'];

  return (
    <div className="card-premium" style={{ minHeight: '340px' }}>
      <div className="analytic-header">
        <div>
          <span className="card-premium-title" style={{ fontSize: 16 }}>Analytic view</span>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{current.label}</div>
        </div>
        <div className="analytic-tabs">
          {tabs.map(t => (
            <div 
              key={t} 
              className={`analytic-tab ${activeTab === t ? 'active' : ''}`}
              onClick={() => setActiveTab(t)}
            >
              {activeTab === t && <div className="active-dot" />}
              {t}
            </div>
          ))}
          <div className="analytic-tab" style={{ padding: '6px 8px' }}>
            <ArrowUpRight size={14} />
          </div>
        </div>
      </div>

      <div className="analytic-stats-row" style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
        <div className="analytic-stat-item">
          <div className="analytic-stat-val">
            {stats.total} 
            <span className="trend-up">↗</span>
          </div>
          <div className="analytic-stat-label">Total activities</div>
        </div>
        <div className="analytic-stat-item">
          <div className="analytic-stat-val">
            {stats.avg} 
            <span className="trend-up">↗</span>
          </div>
          <div className="analytic-stat-label">Average per day</div>
        </div>
        <div className="analytic-stat-item">
          <div className="analytic-stat-val">
             {stats.max} 
             <span className="trend-up">↗</span>
          </div>
          <div className="analytic-stat-label">Maximum intensity</div>
        </div>
      </div>

      <div className="heatmap-container" style={{ 
        opacity: loading ? 0.3 : 1, 
        transition: 'opacity 0.2s', 
        height: '140px',
        overflow: 'hidden'
      }}>
        <div className="heatmap-days">
          {activeTab === 'Day' ? (
            <>
              <span>00h</span>
              <span>04h</span>
              <span>08h</span>
              <span>11h</span>
              <span>14h</span>
              <span>17h</span>
              <span>21h</span>
            </>
          ) : (
            <>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </>
          )}
        </div>
        <div className="heatmap-grid" style={{ 
          gridTemplateColumns: `repeat(${current.weeks}, 1fr)`,
          overflowX: activeTab === 'Year' || activeTab === 'All' ? 'auto' : 'hidden'
        }}>
          {levels.map((item, i) => (
            <div 
              key={i} 
              className={`heatmap-block level-${item.level} ${i === levels.length - 1 ? 'is-today' : ''}`} 
              onMouseEnter={(e) => handleMouseEnter(item, i, e)}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              style={{ cursor: 'pointer' }}
            />
          ))}
        </div>
      </div>

      {tooltip.visible && (
        <div 
          className="heatmap-tooltip"
          style={{ 
            left: tooltip.x + 10,
            top: tooltip.y + 10,
            transform: (tooltip.x + 220 > window.innerWidth) ? 'translateX(-100%)' : 'none'
          }}
        >
          <div className="heatmap-tooltip-date">{tooltip.date}</div>
          <div className="heatmap-tooltip-title">
            <Activity size={12} className="text-primary" />
            {tooltip.count} {tooltip.count <= 1 ? 'action' : 'actions'}
          </div>
          {tooltip.repos.length > 0 ? (
            <div className="heatmap-tooltip-repos">
              {tooltip.repos.map(repo => (
                <div key={repo.name} className="heatmap-tooltip-repo">
                  <div style={{ fontWeight: 600 }}>{repo.name}</div>
                  <div style={{ fontSize: 10, opacity: 0.8 }}>{repo.actions.join(', ')}</div>
                </div>
              ))}
            </div>
          ) : tooltip.count > 0 && (
            <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4, fontStyle: 'italic' }}>
              Detailed activity not available
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { projects, projectsLoading, ghUser, ghConnected, dispatch } = useApp();
  const navigate = useNavigate();

  const [activity, setActivity] = useState([]);
  const [ghRepos, setGhRepos] = useState([]);
  const [totalRepos, setTotalRepos] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ghConnected) return;
    setLoading(true);
    Promise.all([
      githubApi.activity().catch(() => []),
      githubApi.repos().catch(() => []),
    ]).then(([act, repos]) => {
      setActivity(act.slice(0, 12));
      setTotalRepos(repos.length);
      setGhRepos(repos.slice(0, 5));
    }).finally(() => setLoading(false));
  }, [ghConnected]);

  const stats = {
    local: projects.length,
    changes: projects.filter(p => p.hasChanges).length,
    behind: projects.filter(p => p.behind > 0).length,
    github: ghConnected ? totalRepos : 0
  };

  function openProject(p) {
    dispatch({ type: 'SELECT_PROJECT', payload: p.id });
    navigate('/git');
  }

  return (
    <div className="page-content">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">
            Welcome back{ghUser?.name ? `, ${ghUser.name.split(' ')[0]}` : ''}!
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            Overview of your connected repositories and local workspace.
          </p>
        </div>
        <button className="btn-upgrade" style={{ width: 'auto', padding: '8px 16px' }}>
          <ArrowUpRight size={14} style={{ marginRight: 6 }} /> Export Report
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-row">
        <PremiumStatCard label="Active Projects" value={stats.local} icon={Briefcase} />
        <PremiumStatCard label="Pending Changes" value={stats.changes} icon={Clock} />
        <PremiumStatCard label="Total Repos" value={stats.github} icon={Activity} />
        <PremiumStatCard label="Behind Remote" value={stats.behind} icon={AlertCircle} />
      </div>

      {/* Main Grid */}
      <div className="main-grid">
        <ActivityHeatmap />
        
        <div className="card-premium">
          <div className="card-premium-header">
            <span className="card-premium-title">Recent repositories</span>
            <Search size={14} className="text-secondary" />
          </div>
          <div className="recent-list">
            {ghRepos.map(r => (
              <div key={r.id} className="recent-item">
                <div className="recent-item-icon">
                  <GitBranch size={14} />
                </div>
                <div className="recent-item-info">
                  <div className="recent-item-name">{r.name}</div>
                  <div className="recent-item-meta">
                    <Users size={10} />
                    <span>{r.owner?.login}</span>
                  </div>
                </div>
              </div>
            ))}
            {ghRepos.length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: 20, textAlign: 'center' }}>
                No remote activity found.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="dashboard-header">
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>Your Repositories</h2>
        <div style={{ display: 'flex', gap: 12 }}>
           <button className="btn-upgrade" style={{ width: 'auto', padding: '6px 12px' }} onClick={() => navigate('/projects')}>
             Manage Projects
           </button>
        </div>
      </div>

      <div className="folder-grid">
        {projects.map(p => (
          <FolderCard key={p.id} project={p} onClick={() => openProject(p)} />
        ))}
        {projects.length === 0 && (
          <div className="card-premium" style={{ gridColumn: 'span 4', textAlign: 'center', padding: 48 }}>
            <Folder size={48} style={{ opacity: 0.1, marginBottom: 16 }} />
            <p style={{ color: 'var(--text-muted)' }}>No local projects added yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
