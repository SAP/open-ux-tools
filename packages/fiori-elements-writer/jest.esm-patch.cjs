/**
 * Patch jest-resolve's shouldLoadAsEsm to allow CJS require() of workspace package dist files.
 *
 * Problem: @sap/ux-cds-compiler-facade (CJS) calls require() on workspace packages that are
 * ESM ("type": "module"). Jest's shouldLoadAsEsm() returns true for these files and
 * requireModule throws "Must use import to load ES Module" before transformation occurs.
 *
 * Solution: Override shouldLoadAsEsm() to return false for workspace package dist/*.js files.
 */
const path = require('path');

const workspacePackagesDir = path.resolve(__dirname, '..', '..', 'packages') + path.sep;

function patchResolver() {
    const candidates = [
        path.resolve(__dirname, '../../node_modules/.pnpm/jest-resolve@30.3.0/node_modules/jest-resolve'),
    ];

    try {
        candidates.push(require.resolve('jest-resolve'));
    } catch {}

    for (const candidate of candidates) {
        try {
            const mod = require(candidate);
            const ResolverClass = mod.default || mod;

            if (ResolverClass && typeof ResolverClass.unstable_shouldLoadAsEsm === 'function') {
                const original = ResolverClass.unstable_shouldLoadAsEsm;

                ResolverClass.unstable_shouldLoadAsEsm = function patchedShouldLoadAsEsm(modulePath, extensionsToTreatAsEsm) {
                    if (
                        modulePath &&
                        modulePath.endsWith('.js') &&
                        modulePath.startsWith(workspacePackagesDir)
                    ) {
                        const relPath = modulePath.slice(workspacePackagesDir.length);
                        if (relPath.includes(path.sep + 'dist' + path.sep) || relPath.includes('/dist/')) {
                            return false;
                        }
                    }
                    return original(modulePath, extensionsToTreatAsEsm);
                };
                return true;
            }
        } catch {}
    }
    return false;
}

if (!patchResolver()) {
    const Module = require('module');
    const originalLoad = Module._load;
    Module._load = function(request, parent, isMain) {
        const result = originalLoad.call(this, request, parent, isMain);
        if (request === 'jest-resolve' || (typeof request === 'string' && request.endsWith('jest-resolve/build/index.js'))) {
            Module._load = originalLoad;
            const ResolverClass = result.default || result;
            if (ResolverClass && typeof ResolverClass.unstable_shouldLoadAsEsm === 'function') {
                const original = ResolverClass.unstable_shouldLoadAsEsm;
                ResolverClass.unstable_shouldLoadAsEsm = function patchedShouldLoadAsEsm(modulePath, extensionsToTreatAsEsm) {
                    if (
                        modulePath &&
                        modulePath.endsWith('.js') &&
                        modulePath.startsWith(workspacePackagesDir)
                    ) {
                        const relPath = modulePath.slice(workspacePackagesDir.length);
                        if (relPath.includes(path.sep + 'dist' + path.sep) || relPath.includes('/dist/')) {
                            return false;
                        }
                    }
                    return original(modulePath, extensionsToTreatAsEsm);
                };
            }
        }
        return result;
    };
}
