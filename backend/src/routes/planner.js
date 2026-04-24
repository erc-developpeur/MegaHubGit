const express = require('express');
const router = express.Router();
const store = require('../services/store');

// GET /api/planner/:projectId
router.get('/:projectId', (req, res) => {
  try {
    const { projectId } = req.params;
    const data = store.getPlanner(projectId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/planner/:projectId
router.post('/:projectId', (req, res) => {
  try {
    const { projectId } = req.params;
    const { tasks } = req.body;
    if (!Array.isArray(tasks)) return res.status(400).json({ error: 'tasks must be an array' });
    
    const result = store.updatePlanner(projectId, { tasks });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
