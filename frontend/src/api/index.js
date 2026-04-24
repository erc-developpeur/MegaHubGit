/**
 * API Client — All calls to the Express backend.
 * Vite proxy routes /api -> http://localhost:3001
 */

const BASE = '/api';

async function request(method, path, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

const get   = (path, params = {}) => {
  const qs = Object.keys(params).length
    ? '?' + new URLSearchParams(params).toString()
    : '';
  return request('GET', path + qs);
};
const post  = (path, body) => request('POST', path, body);
const del   = (path, body) => request('DELETE', path, body);
const patch = (path, body) => request('PATCH', path, body);

// ── Projects ──────────────────────────────────────────────────
export const projectsApi = {
  list:   ()         => get('/projects'),
  add:    (data)     => post('/projects', data),
  remove: (id)       => del(`/projects/${id}`),
  update: (id, data) => patch(`/projects/${id}`, data),
  status: (id)       => get(`/projects/${id}/status`),
  exportConfig: ()   => post('/projects/export'),
  uploadLogo: (id, file) => {
    const formData = new FormData();
    formData.append('logo', file);
    return fetch(`${BASE}/projects/${id}/logo`, {
      method: 'POST',
      body: formData,
    }).then(res => res.json());
  },
};

// ── Git ───────────────────────────────────────────────────────
export const gitApi = {
  status:          (projectId) => get('/git/status', { projectId }),
  stage:           (projectId, files)  => post('/git/stage', { projectId, files }),
  stageAll:        (projectId)         => post('/git/stage', { projectId, all: true }),
  unstage:         (projectId, files)  => post('/git/unstage', { projectId, files }),
  commit:          (projectId, message, amend) => post('/git/commit', { projectId, message, amend }),
  push:            (projectId, remote, branch) => post('/git/push', { projectId, remote, branch }),
  pull:            (projectId, remote, branch) => post('/git/pull', { projectId, remote, branch }),
  fetch:           (projectId)         => post('/git/fetch', { projectId }),
  branches:        (projectId)         => get('/git/branches', { projectId }),
  createBranch:    (projectId, name, checkout) => post('/git/branches/create', { projectId, name, checkout }),
  switchBranch:    (projectId, name)   => post('/git/branches/switch', { projectId, name }),
  deleteBranch:    (projectId, name, force) => del(`/git/branches/${encodeURIComponent(name)}?projectId=${projectId}${force ? '&force=true' : ''}`),
  mergeBranch:     (projectId, name)   => post('/git/branches/merge', { projectId, name }),
  log:             (projectId, limit)  => get('/git/log',  { projectId, limit }),
  diff:            (projectId, file, staged) => get('/git/diff', { projectId, file, staged }),
  stashList:       (projectId)         => get('/git/stash', { projectId }),
  stashPush:       (projectId, message) => post('/git/stash/push', { projectId, message }),
  stashPop:        (projectId, index)  => post('/git/stash/pop', { projectId, index }),
  stashDrop:       (projectId, index)  => del(`/git/stash/${index}?projectId=${projectId}`),
  clone:           (url, targetPath)   => post('/git/clone', { url, targetPath }),
  remotes:         (projectId)         => get('/git/remotes', { projectId }),
};

// ── GitHub ────────────────────────────────────────────────────
export const githubApi = {
  setToken:   (token)           => post('/github/token', { token }),
  removeToken: ()               => del('/github/token'),
  me:         ()                => get('/github/me'),
  repos:      ()                => get('/github/repos'),
  pulls:      (owner, repo, state) => get(`/github/repos/${owner}/${repo}/pulls`, { state }),
  createPR:   (owner, repo, data)  => post(`/github/repos/${owner}/${repo}/pulls`, data),
  issues:     (owner, repo)    => get(`/github/repos/${owner}/${repo}/issues`),
  commits:    (owner, repo)    => get(`/github/repos/${owner}/${repo}/commits`),
  activity:   ()               => get('/github/activity'),
  stats:      ()               => get('/github/stats'),
  importAll:  ()               => post('/github/import-all'),
};

// ── Planner ───────────────────────────────────────────────────
export const plannerApi = {
  get:  (projectId) => get(`/planner/${projectId}`),
  save: (projectId, tasks) => post(`/planner/${projectId}`, { tasks }),
};
