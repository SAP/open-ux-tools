// CLASSIFICATION: [OPEN]
import { join } from 'node:path';
import { render, escapeXML } from 'ejs';
import type { Data, Options } from 'ejs';
import { readFile } from '../file-access.js';

// esbuild minifies closure-captured variable names, including the `escapeFn` that
// EJS's compiled template functions reference by name. Passing `escape` explicitly
// in opts prevents EJS from relying on that renamed closure variable at runtime.
const DEFAULT_EJS_OPTS: Options = { escape: escapeXML };

/**
 * Render a template file
 *
 * Reads the template file and optionally renders it using EJS.
 * If rendering is disabled, returns the raw file content.
 *
 * @param templateRoot - Root directory containing templates
 * @param fullTemplateName - Full path to template file relative to templateRoot
 * @param templateData - Data to use for template rendering
 * @param opts - EJS rendering options
 * @param isRendered - Whether to render the template or return raw content
 * @returns Rendered template content or raw file content
 */
export async function renderTemplate(
    templateRoot: string,
    fullTemplateName: string,
    templateData: Data,
    opts: object,
    isRendered: boolean
): Promise<string> {
    const templateFile = await readFile(join(templateRoot, fullTemplateName));

    return isRendered ? render(templateFile, templateData, { ...DEFAULT_EJS_OPTS, ...opts }) : templateFile;
}
