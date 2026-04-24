const express = require('express');
const router = express.Router();
const { Octokit } = require('@octokit/rest');
const store = require('../services/store');

function getOctokit() {
  const tokens = store.getTokens();
  if (!tokens.github) throw new Error('GitHub token not configured. Please add it in Settings.');
  return new Octokit({ auth: tokens.github });
}

// ── Auth ──────────────────────────────────────────────────────────────────────

// POST /api/github/token — Save GitHub PAT
router.post('/token', (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'token required' });
    store.setToken('github', token);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/github/token — Remove GitHub PAT
router.delete('/token', (req, res) => {
  store.removeToken('github');
  res.json({ success: true });
});

// GET /api/github/me — Current authenticated user
router.get('/me', async (req, res) => {
  try {
    const octokit = getOctokit();
    const { data } = await octokit.users.getAuthenticated();
    res.json({
      login: data.login,
      name: data.name,
      avatar_url: data.avatar_url,
      html_url: data.html_url,
      public_repos: data.public_repos,
      followers: data.followers,
      following: data.following,
      bio: data.bio,
    });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

// GET /api/github/repos — User repos (own + collaborator)
router.get('/repos', async (req, res) => {
  try {
    const octokit = getOctokit();
    const { data } = await octokit.repos.listForAuthenticatedUser({
      per_page: 100,
      sort: 'updated',
      affiliation: 'owner,collaborator',
    });
    res.json(
      data.map(r => ({
        id: r.id,
        name: r.name,
        full_name: r.full_name,
        description: r.description,
        clone_url: r.clone_url,
        ssh_url: r.ssh_url,
        html_url: r.html_url,
        default_branch: r.default_branch,
        private: r.private,
        stargazers_count: r.stargazers_count,
        language: r.language,
        updated_at: r.updated_at,
        open_issues_count: r.open_issues_count,
      }))
    );
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/github/repos/:owner/:repo/pulls — Pull requests
router.get('/repos/:owner/:repo/pulls', async (req, res) => {
  try {
    const octokit = getOctokit();
    const { owner, repo } = req.params;
    const { state } = req.query;
    const { data } = await octokit.pulls.list({
      owner,
      repo,
      state: state || 'open',
      per_page: 30,
    });
    res.json(
      data.map(pr => ({
        id: pr.id,
        number: pr.number,
        title: pr.title,
        state: pr.state,
        html_url: pr.html_url,
        user: { login: pr.user.login, avatar_url: pr.user.avatar_url },
        head: pr.head.ref,
        base: pr.base.ref,
        created_at: pr.created_at,
        updated_at: pr.updated_at,
        draft: pr.draft,
      }))
    );
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/github/repos/:owner/:repo/pulls — Create PR
router.post('/repos/:owner/:repo/pulls', async (req, res) => {
  try {
    const octokit = getOctokit();
    const { owner, repo } = req.params;
    const { title, body, head, base } = req.body;
    const { data } = await octokit.pulls.create({ owner, repo, title, body, head, base });
    res.json({ number: data.number, html_url: data.html_url });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/github/repos/:owner/:repo/issues — Issues
router.get('/repos/:owner/:repo/issues', async (req, res) => {
  try {
    const octokit = getOctokit();
    const { owner, repo } = req.params;
    const { data } = await octokit.issues.listForRepo({
      owner,
      repo,
      state: 'open',
      per_page: 20,
    });
    // Filter out PRs (GitHub returns them as issues too)
    res.json(
      data
        .filter(i => !i.pull_request)
        .map(i => ({
          id: i.id,
          number: i.number,
          title: i.title,
          state: i.state,
          html_url: i.html_url,
          user: { login: i.user.login },
          labels: i.labels.map(l => ({ name: l.name, color: l.color })),
          created_at: i.created_at,
        }))
    );
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/github/repos/:owner/:repo/commits — Recent commits
router.get('/repos/:owner/:repo/commits', async (req, res) => {
  try {
    const octokit = getOctokit();
    const { owner, repo } = req.params;
    const { data } = await octokit.repos.listCommits({ owner, repo, per_page: 20 });
    res.json(
      data.map(c => ({
        sha: c.sha,
        shaShort: c.sha.substring(0, 7),
        message: c.commit.message.split('\n')[0],
        author: c.commit.author.name,
        date: c.commit.author.date,
        html_url: c.html_url,
      }))
    );
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/github/stats — Contribution stats (GraphQL)
router.get('/stats', async (req, res) => {
  try {
    const octokit = getOctokit();
    const { data: user } = await octokit.users.getAuthenticated();
    
    // GraphQL query for the contribution calendar
    const query = `
      query {
        viewer {
          contributionsCollection {
            contributionCalendar {
              totalContributions
              weeks {
                contributionDays {
                  contributionCount
                  date
                  color
                }
              }
            }
          }
        }
      }
    `;
    
    const result = await octokit.graphql(query);
    const calendar = result.viewer.contributionsCollection.contributionCalendar;
    
    // Flatten the weeks/days into a single array of counts
    // This will give us a continuous array of daily contributions
    // Flatten the weeks/days into a single array of counts
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Stop at today and log for debugging
    const dailyCounts = calendar.weeks
      .flatMap(w => w.contributionDays)
      .map(d => ({
        count: d.contributionCount,
        date: d.date,
        level: d.contributionCount === 0 ? 0 : (d.contributionCount < 3 ? 1 : (d.contributionCount < 6 ? 2 : (d.contributionCount < 9 ? 3 : 4)))
      }))
      .filter(d => d.date <= todayStr);

    console.log('--- DBG: LAST 7 DAYS ---');
    dailyCounts.slice(-7).forEach(d => console.log(`${d.date}: ${d.count}`));
    console.log('------------------------');
    
    res.json({
      total: calendar.totalContributions,
      dailyCounts
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/github/activity — User event activity
router.get('/activity', async (req, res) => {
  try {
    const octokit = getOctokit();
    const { data: user } = await octokit.users.getAuthenticated();
    const { data } = await octokit.activity.listPublicEventsForUser({
      username: user.login,
      per_page: 30,
    });
    res.json(
      data.map(e => ({
        id: e.id,
        type: e.type,
        repo: e.repo.name,
        created_at: e.created_at,
        payload: e.payload,
      }))
    );
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/github/import-all — Import all user repos as Lite projects
router.post('/import-all', async (req, res) => {
  try {
    const octokit = getOctokit();
    const { data: repos } = await octokit.repos.listForAuthenticatedUser({
      per_page: 100,
      affiliation: 'owner',
    });

    const projectsToImport = repos.map(repo => ({
      name: repo.name,
      isLite: true,
      repoUrl: repo.clone_url,
      followOnly: false
    }));

    const imported = store.addProjects(projectsToImport);
    const skipped = repos.length - imported.length;

    res.json({ success: true, imported: imported.length, skipped });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
