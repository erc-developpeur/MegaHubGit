/**
 * Store Service — Persists config (tokens, projects) to a local JSON file.
 * Config location: %APPDATA%/MegaHubGit/config.json
 */

const path = require('path');
const os = require('os');
const fs = require('fs');

const CONFIG_DIR = path.join(os.homedir(), 'AppData', 'Roaming', 'MegaHubGit');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function readConfig() {
  ensureConfigDir();
  if (!fs.existsSync(CONFIG_FILE)) {
    return { projects: [], tokens: {} };
  }
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { projects: [], tokens: {} };
  }
}

function writeConfig(data) {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// ── Projects ─────────────────────────────────────────────────────────────────

function getProjects() {
  return readConfig().projects || [];
}

function addProject(project) {
  const config = readConfig();
  const { path: repoPath, name, followOnly, isLite, repoUrl } = project;

  if (!isLite && !repoPath) throw new Error('Project path is required for local projects');

  // Check for duplicates
  if (repoPath && config.projects.find(p => p.path === repoPath)) {
    throw new Error('Project already exists');
  }

  const id = Date.now().toString();
  const newProject = {
    id,
    name: name || (repoPath ? path.basename(repoPath) : _extractRepoName(repoUrl)),
    path: repoPath || null,
    isGit: true,
    followOnly: !!followOnly || !!isLite,
    isLite: !!isLite,
    repoUrl: repoUrl || null,
    addedAt: new Date().toISOString(),
  };

  config.projects.push(newProject);
  writeConfig(config);
  return newProject;
}

function _extractRepoName(url) {
  if (!url) return 'Unknown Repo';
  const match = url.match(/\/([^\/]+?)(?:\.git)?$/);
  return match ? match[1] : 'Remote Repo';
}

function removeProject(id) {
  const config = readConfig();
  config.projects = config.projects.filter(p => p.id !== id);
  writeConfig(config);
}

function updateProject(id, updates) {
  const config = readConfig();
  const idx = config.projects.findIndex(p => p.id === id);
  if (idx === -1) throw new Error('Project not found');
  config.projects[idx] = { ...config.projects[idx], ...updates };
  writeConfig(config);
  return config.projects[idx];
}

// ── Planner ───────────────────────────────────────────────────────────────────

function getPlanner(projectId) {
  const config = readConfig();
  if (!config.planner) config.planner = {};
  return config.planner[projectId] || { tasks: [] };
}

function updatePlanner(projectId, data) {
  const config = readConfig();
  if (!config.planner) config.planner = {};
  config.planner[projectId] = data;
  writeConfig(config);
  return config.planner[projectId];
}

// ── Tokens ────────────────────────────────────────────────────────────────────

function getTokens() {
  return readConfig().tokens || {};
}

function setToken(provider, token) {
  const config = readConfig();
  if (!config.tokens) config.tokens = {};
  config.tokens[provider] = token;
  writeConfig(config);
}

function removeToken(provider) {
  const config = readConfig();
  if (config.tokens) {
    delete config.tokens[provider];
    writeConfig(config);
  }
}

module.exports = {
  getProjects,
  addProject,
  removeProject,
  updateProject,
  getTokens,
  setToken,
  removeToken,
  getPlanner,
  updatePlanner,
};
