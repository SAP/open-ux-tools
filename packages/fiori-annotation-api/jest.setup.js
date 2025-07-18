const { spawnSync } = require('child_process');
const { join } = require('path');
const { symlink, rm, stat } = require('fs/promises');
const { platform } = require('os');

const fiveMinutes = 5 * 60000;
const TEST_DATA_ROOT = join(__dirname, 'test', 'data');
const NODE_MODULES = 'node_modules';

const CDS_PROJECTS = ['cap-start', 'cap-no-apps', 'layering', 'term-deletion'].map((project) =>
    join(TEST_DATA_ROOT, 'cds', project)
);

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

module.exports = async function () {
    // for watch mode assume that node modules are already installed
    const skipInstall = process.argv.find((arg) => arg === '--watch');
    const cdsRoot = getCdsRoot('maintenance');

    if (skipInstall) {
        return;
    }

    npmInstall(cdsRoot);

    for (const projectPath of CDS_PROJECTS) {
        const targetPath = join(projectPath, NODE_MODULES);
        console.log(`Linking ${cdsRoot} -> ${targetPath}`);
        try {
            await stat(targetPath);
            await rm(targetPath, { recursive: true });
        } catch (error) {
            console.log(error);
        } finally {
            // type required for windows
            await symlink(join(cdsRoot, NODE_MODULES), targetPath, 'junction');
        }
    }
};

const CDS_MAINTENANCE_ROOT = join(TEST_DATA_ROOT, 'cds-maintenance');
const CDS_LATEST_ROOT = join(TEST_DATA_ROOT, 'cds-latest');
const CDS_NEXT_ROOT = join(TEST_DATA_ROOT, 'cds-next');

function getCdsRoot(branch) {
    if (!branch) {
        return CDS_LATEST_ROOT;
    }
    if (branch === 'next') {
        return CDS_NEXT_ROOT;
    }
    if (branch === 'latest') {
        return CDS_LATEST_ROOT;
    }
    if (branch === 'maintenance') {
        return CDS_MAINTENANCE_ROOT;
    }
    throw new Error(`Invalid branch name: ${branch}. Expected 'maintenance', 'latest' or 'next'.`);
}

