import { readFileSync, writeFileSync } from 'node:fs';
import { render } from 'ejs';
import { getTemplatePath } from '../utils';

/**
 * Render an EJS template directly to disk.
 * Intentionally bypasses mem-fs — mta-lib and other consumers require the file to be
 * physically present on the file system before they can read it back.
 *
 * @param templateName Template path relative to the `templates/` folder (e.g. `app/mta.yaml`)
 * @param outputPath Absolute path where the rendered file will be written
 * @param data Template data object passed to EJS
 */
export function renderTemplateToDisk(templateName: string, outputPath: string, data: Record<string, unknown>): void {
    const template = readFileSync(getTemplatePath(templateName), 'utf-8');
    writeFileSync(outputPath, render(template, data));
}
