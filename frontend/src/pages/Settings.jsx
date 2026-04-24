import { useState } from 'react';
import { 
  GitBranch, 
  ShieldCheck, 
  Trash2, 
  Info,
  Server,
  Zap, 
  Globe, 
  Settings as SettingsIcon,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { githubApi, projectsApi } from '../api/index.js';

function TokenSection({ provider, label, icon: Icon, description, onSaved }) {
  const [token, setToken]   = useState('');
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const { ghConnected, ghUser, toast, loadGhUser } = useApp();

  const connected = provider === 'github' ? ghConnected : false;
  const user      = provider === 'github' ? ghUser : null;

  async function handleSave(e) {
    e.preventDefault();
    if (!token.trim()) return;
    setLoading(true);
    try {
      if (provider === 'github') {
        await githubApi.setToken(token);
        await loadGhUser();
        toast('GitHub connected!', 'success');
        setToken('');
        onSaved();
      }
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove() {
    if (!confirm(`Disconnect ${label}?`)) return;
    setRemoving(true);
    try {
      if (provider === 'github') {
        await githubApi.removeToken();
        await loadGhUser();
        toast(`${label} disconnected`, 'info');
      }
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="card-premium" style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <div style={{
          width: 52, height: 52, borderRadius: '12px',
          background: connected ? 'var(--green-dim)' : 'var(--bg-root)',
          border: `1px solid ${connected ? 'rgba(16,185,129,0.2)' : 'var(--border)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: connected ? 'var(--green)' : 'var(--text-muted)'
        }}>
          <Icon size={24} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 17, fontWeight: 700 }}>{label}</span>
            {connected && <span className="badge badge-green" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle2 size={10}/> Connected</span>}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{description}</div>
        </div>
      </div>

      {connected && user ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            background: 'var(--bg-root)', borderRadius: 'var(--radius-md)',
            padding: '16px',
            border: '1px solid var(--border)',
          }}>
            {user.avatar_url && (
              <img src={user.avatar_url} alt={user.login} style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.05)' }} />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{user.name || user.login}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>@{user.login}</div>
            </div>
            <div style={{ display: 'flex', gap: 20, fontSize: 12, color: 'var(--text-secondary)' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 16 }}>{user.public_repos}</div>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Repos</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 16 }}>{user.followers}</div>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Followers</div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              className={`btn btn-danger btn-sm ${removing ? 'btn-loading' : ''}`}
              onClick={handleRemove}
              disabled={removing}
              style={{ width: 'fit-content' }}
            >
              <Trash2 size={14} style={{ marginRight: 8 }} /> Disconnect {label}
            </button>
            {provider === 'github' && (
              <button
                className={`btn btn-secondary btn-sm ${loading ? 'btn-loading' : ''}`}
                onClick={async () => {
                  setLoading(true);
                  try {
                    const res = await githubApi.importAll();
                    toast(`Imported ${res.imported} repos (${res.skipped} skipped)`, 'success');
                  } catch (err) {
                    toast(err.message, 'error');
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
              >
                <GitBranch size={14} style={{ marginRight: 8 }} /> Import All Repos
              </button>
            )}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label style={{ fontSize: 12, fontWeight: 500, marginBottom: 8, display: 'block' }}>Personal Access Token</label>
            <input
              type="password"
              className="input"
              placeholder={provider === 'github' ? 'ghp_xxxxxxxxxxxxxxxxxxxx' : 'glpat-xxxxxxxxxxxxxxxxxxxx'}
              value={token}
              onChange={e => setToken(e.target.value)}
              style={{ background: 'var(--bg-root)', border: '1px solid var(--border)' }}
            />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, display: 'block' }}>
              <Info size={10} style={{ marginRight: 4 }} />
              Generate at {provider}.com settings. Needs 'repo' and 'read:user' permissions.
            </span>
          </div>
          <button
            type="submit"
            className={`btn btn-primary ${loading ? 'btn-loading' : ''}`}
            disabled={loading || !token.trim()}
            style={{ width: 'fit-content' }}
          >
            Connect {label}
          </button>
        </form>
      )}
    </div>
  );
}

export default function Settings() {
  const { toast } = useApp();
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="page-content">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Settings</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            Manage your Git integrations, personal preferences, and application config.
          </p>
        </div>
        <button className="btn-upgrade" style={{ width: 'auto', padding: '8px 16px' }}>
          <ShieldCheck size={14} style={{ marginRight: 6 }} /> Reset All
        </button>
      </div>

      <div style={{ maxWidth: 800 }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Zap size={18} fill="white" />
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>Git Integrations</h2>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Connect your hosting providers using Personal Access Tokens. 
            MegaHubGit stores tokens securely on your local machine and never transmits them to exterior services.
          </p>
        </div>

        <TokenSection
          key={`gh-${refreshKey}`}
          provider="github"
          label="GitHub"
          icon={GitBranch}
          description="Access your public and private repositories, pull requests, and profiles."
          onSaved={() => setRefreshKey(k => k + 1)}
        />

        {/* GitLab coming soon */}
        <div className="card-premium" style={{ borderStyle: 'dashed', opacity: 0.6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
             <div style={{ width: 52, height: 52, borderRadius: '12px', background: 'var(--bg-root)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                <Globe size={24} />
             </div>
             <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 17, fontWeight: 700 }}>GitLab</span>
                  <span className="badge badge-gray">Planned v2.0</span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Native GitLab integration for corporate workspaces.</p>
             </div>
          </div>
        </div>

        <div style={{ margin: '40px 0 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <SettingsIcon size={18} />
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>Application</h2>
        </div>

        <div className="card-premium" style={{ background: 'var(--bg-root)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { label: 'Version', value: '1.0.0-gold', icon: ShieldCheck },
              { label: 'Environment', value: 'Production (Local)', icon: Server },
              { label: 'API Endpoint', value: 'http://localhost:3001', icon: Globe },
              { label: 'Config path', value: 'Local AppData/MegaHubGit/config.json', icon: Info },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <item.icon size={14} className="text-secondary" />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', flex: 1 }}>{item.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'monospace' }}>{item.value}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
             <button 
               className="btn btn-secondary btn-sm"
               onClick={async () => {
                 try {
                   const res = await projectsApi.exportConfig();
                   toast(`Backup saved to: ${res.path}`, 'success');
                 } catch (err) {
                   toast(err.message, 'error');
                 }
               }}
             >
               <ExternalLink size={14} style={{ marginRight: 8 }} /> Export Backup to Documents
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
