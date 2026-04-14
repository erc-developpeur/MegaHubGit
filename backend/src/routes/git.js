const express = require('express');
const router = express.Router();
const store = require('../services/store');
const gitService = require('../services/gitService');
const githubService = require('../services/githubService');

// Helper: resolve project path from body or query
function resolveProject(req) {
  const projectId = req.body?.projectId || req.query?.projectId;
  const repoPath  = req.body?.repoPath  || req.query?.repoPath;
  if (repoPath) return { path: repoPath, followOnly: false };
  if (projectId) {
    const projects = store.getProjects();
    const project = projects.find(p => p.id === projectId);
    if (!project) throw new Error('Project not found');
    return project;
  }
  throw new Error('projectId or repoPath is required');
}

// ── Status ────────────────────────────────────────────────────────────────────
router.get('/status', async (req, res) => {
  try {
    const project = resolveProject(req);
    if (project.isLite) {
      const status = await githubService.getLiteStatus(project.repoUrl);
      return res.json({ ...status, followOnly: true });
    }
    const status = await gitService.getStatus(project.path);
    res.json({ ...status, followOnly: project.followOnly });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Stage ─────────────────────────────────────────────────────────────────────
router.post('/stage', async (req, res) => {
  try {
    const project = resolveProject(req);
    if (project.followOnly) return res.status(403).json({ error: 'Project is in Follow Mode (Read-Only)' });
    
    const { files, all } = req.body;
    if (all) {
      await gitService.stageAll(project.path);
    } else {
      if (!files || !files.length) return res.status(400).json({ error: 'files required' });
      await gitService.stageFiles(project.path, files);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Unstage ───────────────────────────────────────────────────────────────────
router.post('/unstage', async (req, res) => {
  try {
    const project = resolveProject(req);
    const { files } = req.body;
    if (!files || !files.length) return res.status(400).json({ error: 'files required' });
    await gitService.unstageFiles(project.path, files);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Commit ────────────────────────────────────────────────────────────────────
router.post('/commit', async (req, res) => {
  try {
    const project = resolveProject(req);
    if (project.followOnly) return res.status(403).json({ error: 'Project is in Follow Mode (Read-Only)' });

    const { message, amend } = req.body;
    if (!message && !amend) return res.status(400).json({ error: 'message required' });
    const result = await gitService.commit(project.path, message, { amend });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Push ──────────────────────────────────────────────────────────────────────
router.post('/push', async (req, res) => {
  try {
    const project = resolveProject(req);
    if (project.followOnly) return res.status(403).json({ error: 'Project is in Follow Mode (Read-Only)' });

    const { remote, branch } = req.body;
    const result = await gitService.push(project.path, remote, branch);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Pull ──────────────────────────────────────────────────────────────────────
router.post('/pull', async (req, res) => {
  try {
    const project = resolveProject(req);
    const { remote, branch } = req.body;
    const result = await gitService.pull(project.path, remote, branch);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
router.post('/fetch', async (req, res) => {
  try {
    const project = resolveProject(req);
    const result = await gitService.fetch(project.path);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Branches ──────────────────────────────────────────────────────────────────
router.get('/branches', async (req, res) => {
  try {
    const project = resolveProject(req);
    if (project.isLite) {
      const branches = await githubService.getLiteBranches(project.repoUrl);
      return res.json(branches);
    }
    const branches = await gitService.getBranches(project.path);
    res.json(branches);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/branches/create', async (req, res) => {
  try {
    const project = resolveProject(req);
    const { name, checkout } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const result = await gitService.createBranch(project.path, name, checkout !== false);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/branches/switch', async (req, res) => {
  try {
    const project = resolveProject(req);
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const result = await gitService.switchBranch(project.path, name);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/branches/:name', async (req, res) => {
  try {
    const project = resolveProject(req);
    const { force } = req.query;
    const result = await gitService.deleteBranch(project.path, req.params.name, force === 'true');
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/branches/merge', async (req, res) => {
  try {
    const project = resolveProject(req);
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const result = await gitService.mergeBranch(project.path, name);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Log ───────────────────────────────────────────────────────────────────────
router.get('/log', async (req, res) => {
  try {
    const project = resolveProject(req);
    const { limit, branch } = req.query;
    if (project.isLite) {
      const log = await githubService.getLiteLog(project.repoUrl, { limit: parseInt(limit) || 50, branch });
      return res.json(log);
    }
    const log = await gitService.getLog(project.path, { limit: parseInt(limit) || 50 });
    res.json(log);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Diff ─────────────────────────────────────────────────────────────────────
router.get('/diff', async (req, res) => {
  try {
    const project = resolveProject(req);
    const { file, staged } = req.query;
    const result = await gitService.getDiff(project.path, file, staged === 'true');
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Stash ─────────────────────────────────────────────────────────────────────
router.get('/stash', async (req, res) => {
  try {
    const project = resolveProject(req);
    const list = await gitService.stashList(project.path);
    res.json(list);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/stash/push', async (req, res) => {
  try {
    const project = resolveProject(req);
    const { message } = req.body;
    await gitService.stashPush(project.path, message);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/stash/pop', async (req, res) => {
  try {
    const project = resolveProject(req);
    const { index } = req.body;
    await gitService.stashPop(project.path, index);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/stash/:index', async (req, res) => {
  try {
    const project = resolveProject(req);
    await gitService.stashDrop(project.path, parseInt(req.params.index));
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Clone ─────────────────────────────────────────────────────────────────────
router.post('/clone', async (req, res) => {
  try {
    const { url, targetPath } = req.body;
    if (!url || !targetPath) return res.status(400).json({ error: 'url and targetPath required' });
    const result = await gitService.cloneRepo(url, targetPath);
    // Auto-add to projects after clone
    const path = require('path');
    store.addProject({ path: result.path, name: path.basename(result.path) });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Remotes ───────────────────────────────────────────────────────────────────
router.get('/remotes', async (req, res) => {
  try {
    const project = resolveProject(req);
    const remotes = await gitService.getRemotes(project.path);
    res.json(remotes);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
