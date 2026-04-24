const fs = require('fs');
const path = require('path');
const os = require('os');
const CONFIG_FILE = path.join(os.homedir(), 'AppData', 'Roaming', 'MegaHubGit', 'config.json');

if (!fs.existsSync(CONFIG_FILE)) {
    console.log('No config found.');
    process.exit(0);
}

try {
    const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
    const config = JSON.parse(data);
    
    let count = 0;
    config.projects = config.projects.map(p => {
        if (p.isLite && p.followOnly === true) {
            p.followOnly = false;
            count++;
        }
        return p;
    });
    
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
    console.log(`Updated ${count} projects to be visible in Projects page.`);
} catch (e) {
    console.error(e);
}
