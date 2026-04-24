const fs = require('fs');
const path = require('path');
const os = require('os');
const CONFIG_DIR = path.join(os.homedir(), 'AppData', 'Roaming', 'MegaHubGit');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

console.log('Attempting to recover config.json...');

if (!fs.existsSync(CONFIG_FILE)) {
    console.log('File does not exist, nothing to recover.');
    process.exit(0);
}

const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
let config = { projects: [], tokens: {} };

try {
    config = JSON.parse(raw);
    console.log('JSON is valid, no recovery needed.');
} catch (err) {
    console.log('JSON is corrupted, attempting recovery of tokens...');
    
    // Try to find the GitHub token using regex
    const ghTokenMatch = raw.match(/["']github["']\s*:\s*["'](ghp_[a-zA-Z0-9]+)["']/);
    const oldGhTokenMatch = raw.match(/["']github["']\s*:\s*["'](github_pat_[a-zA-Z0-9_]+)["']/);
    
    if (ghTokenMatch) {
        config.tokens.github = ghTokenMatch[1];
        console.log('Recovered GitHub token (ghp_ type)');
    } else if (oldGhTokenMatch) {
        config.tokens.github = oldGhTokenMatch[1];
        console.log('Recovered GitHub token (github_pat_ type)');
    } else {
        console.log('Could not recover GitHub token.');
    }
    
    // Backup corrupted file
    fs.writeFileSync(CONFIG_FILE + '.bak', raw);
    console.log('Backup of corrupted file saved to ' + CONFIG_FILE + '.bak');
}

// Write the (possibly cleaned) config back
fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
console.log('config.json has been reset/fixed.');
