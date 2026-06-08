import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * Resolves the directory of this source/compiled file in a way that works
 * under both the published CommonJS build (where `__dirname` is provided by
 * Node) and ts-jest's ESM test transform (where it isn't).
 *
 * @returns {string} Absolute directory path of this module at runtime.
 */
function resolveModuleDir(): string {
    if (typeof __dirname !== 'undefined') {
        return __dirname;
    }
    if (typeof __filename !== 'undefined') {
        return dirname(__filename);
    }
    return process.cwd();
}

/**
 * This function is used to get the path to the templates directory when this generator is bundled inside `@sap/generator-fiori`.
 * It is used to overwrite the templates directory.
 *
 * @returns {string | undefined} The path to the templates directory.
 */
export function getTemplatesOverwritePath(): string | undefined {
    const templatePath = join(resolveModuleDir(), 'templates');
    if (existsSync(templatePath)) {
        return templatePath;
    }
    return undefined;
}
