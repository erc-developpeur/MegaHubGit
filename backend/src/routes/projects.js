const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const store = require('../services/store');
const gitService = require('../services/gitService');
const multer = require('multer');

// Configure multer for logo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `logo-${req.params.id}-${Date.now()}${ext}`);
  }
});
const upload = multer({ 
  storage,
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB limit
});

// GET /api/projects — List all projects with live git status
router.get('/', async (req, res) => {
  try {
    const projects = store.getProjects();
    const enriched = await Promise.all(
      projects.map(async (project) => {
        try {
          if (project.isLite) {
            return { 
              ...project, 
              isGit: true, 
              branch: 'main', // Default label, will be updated on panel load
              hasChanges: false 
            };
          }
          const isGit = await gitService.isGitRepo(project.path);
          if (!isGit) return { ...project, isGit: false };
          const status = await gitService.getStatus(project.path);
          return {
            ...project,
            isGit: true,
            branch: status.current,
            ahead: status.ahead,
            behind: status.behind,
            hasChanges: !status.isClean,
            modifiedCount: status.modified.length + status.not_added.length + status.deleted.length,
            stagedCount: status.staged.length,
          };
        } catch {
          return { ...project, isGit: false, error: true };
        }
      })
    );
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { path: projectPath, name, followOnly, isLite, repoUrl } = req.body;
    
    // Explicitly handle both boolean and string versions of isLite
    const isReallyLite = (isLite === true || isLite === 'true');

    if (!isReallyLite) {
      if (!projectPath) return res.status(400).json({ error: 'path is required for local projects' });
      if (!fs.existsSync(projectPath)) return res.status(400).json({ error: 'Directory does not exist' });
    }

    const project = store.addProject({ 
      path: isReallyLite ? null : projectPath, 
      name, 
      followOnly: !!followOnly || isReallyLite, 
      isLite: isReallyLite, 
      repoUrl 
    });
    res.status(201).json(project);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/projects/:id — Remove a project
router.delete('/:id', (req, res) => {
  try {
    store.removeProject(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// PATCH /api/projects/:id — Update project metadata (icon, name, color)
router.patch('/:id', (req, res) => {
  try {
    const { icon, name, color } = req.body;
    const updated = store.updateProject(req.params.id, {
      ...(icon  !== undefined && { icon }),
      ...(name  !== undefined && { name }),
      ...(color !== undefined && { color }),
      ...(icon === null && { logo: null }) // Reset logo if icon is reset
    });
    res.json(updated);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// POST /api/projects/:id/logo — Upload a project logo image
router.post('/:id/logo', upload.single('logo'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    const logoUrl = `/uploads/${req.file.filename}`;
    const updated = store.updateProject(req.params.id, { 
      logo: logoUrl,
      icon: null // Clear emoji icon if image is uploaded
    });
    
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/projects/:id/status
router.get('/:id/status', async (req, res) => {
  try {
    const project = store.getProjects().find(p => p.id === req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    
    if (project.isLite) {
      const githubService = require('../services/githubService');
      const status = await githubService.getLiteStatus(project.repoUrl);
      return res.json(status);
    }
    
    const status = await gitService.getStatus(project.path);
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects/export — Export config to user Documents
router.post('/export', (req, res) => {
  try {
    const os = require('os');
    const fs = require('fs');
    const path = require('path');
    
    const configPath = path.join(os.homedir(), 'AppData', 'Roaming', 'MegaHubGit', 'config.json');
    const docsPath = path.join(os.homedir(), 'Documents');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const exportPath = path.join(docsPath, `MegaHubGit_Backup_${timestamp}.json`);

    if (!fs.existsSync(configPath)) {
      return res.status(404).json({ error: 'Config file not found' });
    }

    fs.copyFileSync(configPath, exportPath);
    res.json({ success: true, path: exportPath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
