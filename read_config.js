const fs = require('fs');
const path = require('path');
const os = require('os');
const CONFIG_FILE = path.join(os.homedir(), 'AppData', 'Roaming', 'MegaHubGit', 'config.json');
try {
    const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
    console.log('---START---');
    console.log(data);
    console.log('---END---');
} catch (e) {
    console.error(e);
}
