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
function tryAddApp(dir, projectRoot, applications) {
    const manifestPath = path.join(dir, 'webapp', 'manifest.json');
    if (fs.existsSync(manifestPath)) {
        try {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
            applications.push({
                appRoot: dir,
                projectRoot: projectRoot,
                manifestPath: manifestPath,
                manifest: manifest
            });
            return true;
        } catch {
            // Skip invalid manifests
        }
    }
    return false;
}

function hasCapMarker(dir) {
    if (fs.existsSync(path.join(dir, '.cdsrc.json'))) {
        return true;
    }
    try {
        const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf-8'));
        return !!(pkg.dependencies?.['@sap/cds'] || pkg.devDependencies?.['@sap/cds']);
    } catch {
        return false;
    }
}

function findCapProjectRoot(startDir) {
    let current = startDir;
    for (let i = 0; i < 10; i++) {
        if (hasCapMarker(current)) {
            return current;
        }
        const parent = path.dirname(current);
        if (parent === current) {
            break;
        }
        current = parent;
    }
    return null;
}

function findTestArtifacts(root) {
    const applications = [];

    // Walk up to find a CAP project root (handles case where root is an app subdirectory)
    const capProjectRoot = findCapProjectRoot(root);
    const isCap = capProjectRoot !== null;
    const projectType = isCap ? 'CAPNodejs' : 'EDMXBackend';
    const effectiveRoot = capProjectRoot ?? root;

    // Check if root itself is a Fiori app (e.g. v2-xml-start, v4-xml-start)
    tryAddApp(effectiveRoot, effectiveRoot, applications);

    function walk(dir) {
        let entries;
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
            return;
        }
        for (const entry of entries) {
            if (
                entry.name === 'node_modules' ||
                entry.name === '.git' ||
                entry.name === 'dist' ||
                entry.name === 'lib' ||
                entry.name === 'coverage' ||
                entry.name === 'webapp'
            ) {
                continue;
            }
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                tryAddApp(fullPath, effectiveRoot, applications);
                walk(fullPath);
            }
        }
    }

    walk(effectiveRoot);
    return { artifacts: { applications }, projectType, effectiveRoot };
}

module.exports.createSyncFn = function createSyncFn(workerPath, _options) {
    const resolvedPath = typeof workerPath === 'string' ? workerPath : '';

    if (resolvedPath.includes('artifacts')) {
        return function artifactWorkerStub(filePath) {
            const root = filePath || process.cwd();
            const result = findTestArtifacts(root);
            const { effectiveRoot, ...rest } = result;
            const appRoot = rest.artifacts.applications?.[0]?.appRoot ?? effectiveRoot;
            return {
                ...rest,
                i18nPathsByApp: {},
                appRoot,
                projectRoot: effectiveRoot
            };
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
