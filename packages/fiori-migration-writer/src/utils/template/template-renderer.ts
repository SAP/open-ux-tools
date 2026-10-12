import { join } from 'node:path';
import { render, escapeXML } from 'ejs';
import type { Data, Options } from 'ejs';
import { readFile } from '../file-access.js';

// esbuild minifies closure-captured variable names, including the `escapeFn` that
// EJS's compiled template functions reference by name. Passing `escape` explicitly
// in opts prevents EJS from relying on that renamed closure variable at runtime.
// Setting `async: false` ensures render() returns string synchronously.
const DEFAULT_EJS_OPTS: Options = { escape: escapeXML, async: false };

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
export function renderTemplate(
    templateRoot: string,
    fullTemplateName: string,
    templateData: Data,
    opts: object,
    isRendered: boolean
): string {
    const templateFile = readFile(join(templateRoot, fullTemplateName));

    // NOSONAR - Templates are trusted internal files shipped with this package, not user input.
    // The templateRoot is always the package's own templates/ directory (see templatesDirPath in index.ts).
    return isRendered ? (render(templateFile, templateData, { ...DEFAULT_EJS_OPTS, ...opts }) as string) : templateFile;
}
