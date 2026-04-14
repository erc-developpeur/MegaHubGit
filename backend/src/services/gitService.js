/**
 * Git Service — Wrapper around simple-git.
 * All operations are async and return structured results.
 */

const simpleGit = require('simple-git');
const path = require('path');

function git(repoPath) {
  return simpleGit(repoPath);
}

// ── Status ────────────────────────────────────────────────────────────────────

async function getStatus(repoPath) {
  const sg = git(repoPath);
  const status = await sg.status();
  return {
    current: status.current,
    tracking: status.tracking,
    ahead: status.ahead,
    behind: status.behind,
    staged: status.staged,
    modified: status.modified,
    not_added: status.not_added,
    deleted: status.deleted,
    renamed: status.renamed,
    conflicted: status.conflicted,
    isClean: status.isClean(),
  };
}

// ── Stage / Unstage ───────────────────────────────────────────────────────────

async function stageFiles(repoPath, files) {
  const sg = git(repoPath);
  await sg.add(files);
  return { success: true };
}

async function stageAll(repoPath) {
  const sg = git(repoPath);
  await sg.add('.');
  return { success: true };
}

async function unstageFiles(repoPath, files) {
  const sg = git(repoPath);
  await sg.reset(['HEAD', '--', ...files]);
  return { success: true };
}

// ── Commit ────────────────────────────────────────────────────────────────────

async function commit(repoPath, message, options = {}) {
  const sg = git(repoPath);
  const result = await sg.commit(message, options.amend ? ['--amend', '--no-edit'] : []);
  return {
    commit: result.commit,
    summary: result.summary,
  };
}

// ── Push / Pull ───────────────────────────────────────────────────────────────

async function push(repoPath, remote = 'origin', branch = null) {
  const sg = git(repoPath);
  const status = await sg.status();
  const currentBranch = branch || status.current;
  const result = await sg.push(remote, currentBranch);
  return { success: true, pushed: currentBranch };
}

async function pull(repoPath, remote = 'origin', branch = null) {
  const sg = git(repoPath);
  const status = await sg.status();
  const currentBranch = branch || status.current;
  const result = await sg.pull(remote, currentBranch);
  return {
    success: true,
    summary: result.summary,
    files: result.files,
  };
}

// ── Branches ──────────────────────────────────────────────────────────────────

async function getBranches(repoPath) {
  const sg = git(repoPath);
  const branches = await sg.branch(['-a']);
  return {
    current: branches.current,
    all: branches.all,
    branches: Object.values(branches.branches).map(b => ({
      name: b.name,
      commit: b.commit,
      label: b.label,
      current: b.current,
      remote: b.name.startsWith('remotes/'),
    })),
  };
}

async function createBranch(repoPath, branchName, checkout = true) {
  const sg = git(repoPath);
  if (checkout) {
    await sg.checkoutLocalBranch(branchName);
  } else {
    await sg.branch([branchName]);
  }
  return { success: true, branch: branchName };
}

async function switchBranch(repoPath, branchName) {
  const sg = git(repoPath);
  await sg.checkout(branchName);
  return { success: true, branch: branchName };
}

async function deleteBranch(repoPath, branchName, force = false) {
  const sg = git(repoPath);
  await sg.branch([force ? '-D' : '-d', branchName]);
  return { success: true };
}

async function mergeBranch(repoPath, branchName) {
  const sg = git(repoPath);
  const result = await sg.merge([branchName]);
  return { success: true, result };
}

// ── Log ───────────────────────────────────────────────────────────────────────

async function getLog(repoPath, options = {}) {
  const sg = git(repoPath);
  const limit = options.limit || 50;
  const log = await sg.log({ maxCount: limit });
  return log.all.map(commit => ({
    hash: commit.hash,
    hashShort: commit.hash.substring(0, 7),
    date: commit.date,
    message: commit.message,
    author_name: commit.author_name,
    author_email: commit.author_email,
    refs: commit.refs,
  }));
}

// ── Diff ─────────────────────────────────────────────────────────────────────

async function getDiff(repoPath, file = null, staged = false) {
  const sg = git(repoPath);
  const args = staged ? ['--cached'] : [];
  if (file) args.push('--', file);
  const diff = await sg.diff(args);
  return { diff };
}

// ── Stash ─────────────────────────────────────────────────────────────────────

async function stashPush(repoPath, message = '') {
  const sg = git(repoPath);
  const args = message ? ['push', '-m', message] : ['push'];
  await sg.stash(args);
  return { success: true };
}

async function stashList(repoPath) {
  const sg = git(repoPath);
  const result = await sg.stashList();
  return result.all.map(s => ({
    index: s.index,
    date: s.date,
    message: s.message,
    hash: s.hash,
  }));
}

async function stashPop(repoPath, index = null) {
  const sg = git(repoPath);
  if (index !== null) {
    await sg.stash(['pop', `stash@{${index}}`]);
  } else {
    await sg.stash(['pop']);
  }
  return { success: true };
}

async function stashDrop(repoPath, index) {
  const sg = git(repoPath);
  await sg.stash(['drop', `stash@{${index}}`]);
  return { success: true };
}

// ── Remotes ───────────────────────────────────────────────────────────────────

async function getRemotes(repoPath) {
  const sg = git(repoPath);
  const remotes = await sg.getRemotes(true);
  return remotes;
}

async function fetch(repoPath) {
  const sg = git(repoPath);
  await sg.fetch(['--all', '--prune']);
  return { success: true };
}

// ── Clone ─────────────────────────────────────────────────────────────────────

async function cloneRepo(url, targetPath, options = {}) {
  const sg = simpleGit();
  const args = [];
  if (options.depth) args.push('--depth', options.depth.toString());
  
  await sg.clone(url, targetPath, args);
  return { success: true, path: targetPath };
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function isGitRepo(repoPath) {
  try {
    const sg = git(repoPath);
    await sg.status();
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  getStatus,
  stageFiles,
  stageAll,
  unstageFiles,
  commit,
  push,
  pull,
  getBranches,
  createBranch,
  switchBranch,
  deleteBranch,
  mergeBranch,
  getLog,
  getDiff,
  stashPush,
  stashList,
  stashPop,
  stashDrop,
  getRemotes,
  fetch,
  cloneRepo,
  isGitRepo,
};
