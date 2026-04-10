// CJS mock for synckit - prevents worker thread deadlock in Jest ESM mode.
// synckit uses SharedArrayBuffer + Atomics.wait() which deadlocks under
// Jest's --experimental-vm-modules. This mock provides synchronous stubs
// that return appropriate test data by scanning the file system directly.

const fs = require('fs');
const path = require('path');

/**
 * Scan a directory tree for manifest.json files that indicate Fiori applications.
 * Returns artifacts in the shape expected by the eslint-plugin's project context.
 */
function findTestArtifacts(root) {
    const applications = [];

    function walk(dir) {
        let entries;
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
            return;
        }
        for (const entry of entries) {
            if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name === 'lib' || entry.name === 'coverage') {
                continue;
            }
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                // Check for webapp/manifest.json pattern
                const manifestPath = path.join(fullPath, 'webapp', 'manifest.json');
                if (fs.existsSync(manifestPath)) {
                    try {
                        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
                        applications.push({
                            appRoot: fullPath,
                            projectRoot: fullPath,
                            manifestPath: manifestPath,
                            manifest: manifest
                        });
                    } catch {
                        // Skip invalid manifests
                    }
                }
                walk(fullPath);
            }
        }
    }

    walk(root);
    return { artifacts: { applications }, projectType: 'EDMXBackend' };
}

module.exports.createSyncFn = function createSyncFn(workerPath, _options) {
    const resolvedPath = typeof workerPath === 'string' ? workerPath : '';

    if (resolvedPath.includes('artifacts')) {
        return function artifactWorkerStub(filePath) {
            return findTestArtifacts(filePath || process.cwd());
        };
    }

    // getPathMappingsSync and other workers return empty object
    return function synckitStub() {
        return {};
    };
};

module.exports.runAsWorker = function runAsWorker(_fn) {
    // no-op in test environment
};
