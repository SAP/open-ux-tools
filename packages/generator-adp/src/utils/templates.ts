import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * This function is used to get the path to the templates directory when this generator is bundled inside `@sap/generator-fiori`.
 * It is used to overwrite the templates directory.
 *
 * @returns {string | undefined} The path to the templates directory.
 */
export function getTemplatesOverwritePath(): string | undefined {
    const templatePath = join(__dirname, 'templates');
    if (existsSync(templatePath)) {
        return templatePath;
    }
    return undefined;
}
