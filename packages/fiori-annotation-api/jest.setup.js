const { spawnSync } = require('child_process');
const { join } = require('path');
const { platform } = require('os');

const fiveMinutes = 5 * 60000;
const TEST_DATA_ROOT = join(__dirname, 'test', 'data');
const CDS_PROJECTS = [
    join(TEST_DATA_ROOT, 'cds', 'cap-start'),
    join(TEST_DATA_ROOT, 'cds', 'layering'),
    join(TEST_DATA_ROOT, 'cds', 'term-deletion')
];

function npmInstall(projectPath) {
    console.log(`Installing packages in ${projectPath}. Max time allocated is 5 min.`);
    const cmd = platform() === 'win32' ? `npm.cmd` : 'npm';
    const npm = spawnSync(cmd, ['install', '--ignore-engines'], {
        cwd: projectPath,
        env: process.env,
        shell: true,
        stdio: 'inherit',
        timeout: fiveMinutes
    });

    if (npm.error) {
        console.log(`Error: ${npm.error.message}`);
    } else if (npm.status !== 0) {
        console.log(`npm process exited with code ${npm.status}`);
    } else {
        console.log(`Package installed successfully in ${projectPath}`);
    }
}

module.exports = function () {
    // for watch mode assume that node modules are already installed
    const skipInstall = process.argv.find((arg) => arg === '--watch');

    if (skipInstall) {
        return;
    }

    for (const projectPath of CDS_PROJECTS) {
        npmInstall(projectPath);
    }
};
