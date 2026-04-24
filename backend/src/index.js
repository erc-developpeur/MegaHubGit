const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const projectsRouter = require('./routes/projects');
const gitRouter = require('./routes/git');
const githubRouter = require('./routes/github');
const plannerRouter = require('./routes/planner');

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json());
// Serve uploads as static files
app.use('/uploads', express.static(uploadsDir));

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/projects', projectsRouter);
app.use('/api/git', gitRouter);
app.use('/api/github', githubRouter);
app.use('/api/planner', plannerRouter);

// ── Health ───────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── SSE: Git log streaming ────────────────────────────────────────────────────
app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const heartbeat = setInterval(() => {
    res.write('data: {"type":"heartbeat"}\n\n');
  }, 30000);

  req.on('close', () => clearInterval(heartbeat));
});

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, '127.0.0.1', () => {
  console.log(`\n🚀 MegaHubGit Backend running on http://127.0.0.1:${PORT}\n`);
});
