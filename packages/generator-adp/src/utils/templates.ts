import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * This function is used to get the path to the templates directory when this generator is bundled inside `@sap/generator-fiori`.
 * It is used to overwrite the templates directory.
 *
 * Uses Node's CJS `__dirname` global at runtime (the package compiles to
 * CommonJS — see tsconfig.json). Under ts-jest's ESM test transform
 * `__dirname` is undefined and we fall back to `process.cwd()`.
 *
 * @returns {string | undefined} The path to the templates directory.
 */
export function getTemplatesOverwritePath(): string | undefined {
    const moduleDir = typeof __dirname === 'undefined' ? process.cwd() : __dirname;
    const templatePath = join(moduleDir, 'templates');
    if (existsSync(templatePath)) {
        return templatePath;
    }
    return undefined;
}
