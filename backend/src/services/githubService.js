const { Octokit } = require('@octokit/rest');
const store = require('./store');

function getOctokit() {
  const tokens = store.getTokens();
  if (!tokens.github) {
    // Return a public Octokit if no token, but it will have strict rate limits
    return new Octokit();
  }
  return new Octokit({ auth: tokens.github });
}

function parseUrl(url) {
  if (!url) throw new Error('Repository URL is missing');
  
  // Clean URL: remove leading/trailing whitespace and ensure protocol for matching
  let cleanUrl = url.trim();
  if (!cleanUrl.startsWith('http') && !cleanUrl.startsWith('git@')) {
    cleanUrl = 'https://' + cleanUrl;
  }

  // Match:
  // - https://github.com/owner/repo
  // - github.com/owner/repo
  // - git@github.com:owner/repo
  const match = cleanUrl.match(/github\.com[\/|:]([^\/]+)\/([^\/]+?)(?:\.git)?$/);
  if (!match) throw new Error('Invalid GitHub URL');
  return { owner: match[1], repo: match[2] };
}

async function getLiteStatus(repoUrl) {
  const { owner, repo } = parseUrl(repoUrl);
  const octokit = getOctokit();
  const { data: repository } = await octokit.repos.get({ owner, repo });
  
  return {
    current: repository.default_branch,
    tracking: null,
    ahead: 0,
    behind: 0,
    staged: [],
    modified: [],
    not_added: [],
    deleted: [],
    renamed: [],
    conflicted: [],
    isClean: true,
    remoteUrl: repoUrl,
    isLite: true
  };
}

async function getLiteBranches(repoUrl) {
  const { owner, repo } = parseUrl(repoUrl);
  const octokit = getOctokit();
  const { data: branches } = await octokit.repos.listBranches({ owner, repo, per_page: 100 });
  const { data: repository } = await octokit.repos.get({ owner, repo });

  return {
    current: repository.default_branch,
    all: branches.map(b => b.name),
    branches: branches.map(b => ({
      name: b.name,
      commit: b.commit.sha,
      current: b.name === repository.default_branch,
      remote: true,
    })),
    isLite: true, // Flag for the frontend
  };
}

async function getLiteLog(repoUrl, options = {}) {
  const { owner, repo } = parseUrl(repoUrl);
  const octokit = getOctokit();
  const limit = options.limit || 50;
  
  const { data: commits } = await octokit.repos.listCommits({ 
    owner, 
    repo, 
    per_page: limit,
    sha: options.branch || undefined
  });

  return commits.map(c => ({
    hash: c.sha,
    hashShort: c.sha.substring(0, 7),
    date: c.commit.author.date,
    message: c.commit.message,
    author_name: c.commit.author.name,
    author_email: c.commit.author.email,
    refs: '',
    html_url: c.html_url
  }));
}

module.exports = {
  getLiteStatus,
  getLiteBranches,
  getLiteLog,
};
