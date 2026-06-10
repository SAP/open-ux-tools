import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/**
 * Resolves the vscode instance synchronously.
 *
 * The vscode module is provided by the VS Code extension host as a CommonJS module.
 * Using `createRequire` here (instead of dynamic `import()`) keeps resolution synchronous,
 * which is required because the public API of `featureToggle` is synchronous and
 * consumers (e.g. generator constructors) read the cached instance immediately on
 * first import. A previous async-IIFE based initialization caused a first-run race
 * where the cache was still `null` when consumers read it.
 *
 * @returns the vscode instance, or `undefined` when not running inside the extension
 *          host (e.g. CLI, plain Node).
 */
export function getVSCodeInstance(): any {
    try {
        return require('vscode');
    } catch {
        // Vscode not available, normally in CLI.
        return undefined;
    }
}
