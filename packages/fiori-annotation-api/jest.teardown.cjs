const { join } = require('path');
const { unlink, readdir, readFile } = require('fs/promises');

/**
 * Clean up dist/package.json files created by jest.setup.cjs.
 * These are temporary overrides that make Jest treat workspace ESM dist files as CJS.
 */
module.exports = async function () {
    const packagesDir = join(__dirname, '..', '..');
    const pkgDirs = await readdir(join(packagesDir, 'packages'));
    let removed = 0;
    for (const dir of pkgDirs) {
        const distPkgJson = join(packagesDir, 'packages', dir, 'dist', 'package.json');
        try {
            const content = await readFile(distPkgJson, 'utf8');
            if (content.includes('"type":"commonjs"') || content.includes('"type": "commonjs"')) {
                await unlink(distPkgJson);
                removed++;
            }
        } catch {
            // Ignore if file doesn't exist
        }
    }
    if (removed > 0) {
        console.log('Cleaned up ' + removed + ' dist/package.json files');
    }
};
