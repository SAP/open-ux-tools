import { resolve, normalize } from 'node:path';
import { render, escapeXML } from 'ejs';
import type { Data, Options } from 'ejs';
import { readFile } from '../file-access.js';

// esbuild minifies closure-captured variable names, including the `escapeFn` that
// EJS's compiled template functions reference by name. Passing `escape` explicitly
// in opts prevents EJS from relying on that renamed closure variable at runtime.
// Setting `async: false` ensures render() returns string synchronously.
const DEFAULT_EJS_OPTS: Options = { escape: escapeXML, async: false };

/**
 * Validates that a template path is safe (no path traversal outside templateRoot).
 *
 * @param templateRoot - Root directory containing templates
 * @param templateName - Template file name/path relative to templateRoot
 * @returns The validated absolute path to the template
 * @throws Error if path traversal is detected
 */
function validateTemplatePath(templateRoot: string, templateName: string): string {
    const resolvedRoot = resolve(templateRoot);
    const resolvedPath = resolve(resolvedRoot, templateName);
    const normalizedPath = normalize(resolvedPath);

    // Ensure the resolved path is within the template root (prevent path traversal)
    if (!normalizedPath.startsWith(resolvedRoot)) {
        throw new Error(`Invalid template path: "${templateName}" escapes template root`);
    }

    return normalizedPath;
}

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
 * @throws Error if template path contains path traversal
 */
export function renderTemplate(
    templateRoot: string,
    fullTemplateName: string,
    templateData: Data,
    opts: object,
    isRendered: boolean
): string {
    // Validate path to prevent directory traversal attacks
    const safePath = validateTemplatePath(templateRoot, fullTemplateName);
    const templateFile = readFile(safePath);

    return isRendered ? (render(templateFile, templateData, { ...DEFAULT_EJS_OPTS, ...opts }) as string) : templateFile;
}
