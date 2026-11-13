import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Data } from 'ejs';
import type { Editor } from 'mem-fs-editor';
import type { Manifest, SapAppSourceTemplate } from '../project-spec-types.js';
import { readPackageUpAsync } from './read-package-up-compat.js';
import { v4 as uuidV4 } from 'uuid';
import type { UI5FlexLayer } from '@sap-ux/project-access';
import type { TemplateProperties } from '../types.js';
import { i18nText } from '../i18n.js';
import { writeFile } from './file-access.js';
import uniq from 'lodash/uniq.js';

// Get current directory using import.meta.url (ESM)
const __dirname = dirname(fileURLToPath(import.meta.url));

// Matches strings starting with "sap" or containing ".sap" (e.g., "sap.m", "com.sap.ui")
// Uses atomic groups to prevent backtracking
const sapLibsRegexFilter = /(?:^sap|\.sap)/;

/**
 * Filter out only SAP libs
 *
 * @param manifestLibs
 * @param libsStrInput
 */
export function generateSapLibsStr(manifestLibs: any, libsStrInput: string): string {
    const mlibs = Object.keys(manifestLibs || {});
    // remove spaces and split at comma
    const strlibs = libsStrInput?.replaceAll(' ', '').split(',') || [];
    const libs = mlibs.concat(strlibs);
    const uniquelibs = uniq(libs);

    return uniquelibs.filter((ele) => sapLibsRegexFilter.test(ele)).join(', ');
}

/**
 * Custom error class for migration errors
 */
export class MigrationError extends Error {
    private readonly useMessage: boolean;
    constructor(error: unknown, filename?: string, useMessage?: boolean) {
        const msg = error instanceof Error ? error.message : String(error);
        super(msg);
        this.useMessage = useMessage ?? false;
        this.name = 'MigrationError';

        const errorObj = error instanceof Error ? error : new Error(msg);
        this.setMessage(errorObj, filename);
    }

    private setMessage(error: Error, filename?: string) {
        this.message = determineMessage(error, filename, this.useMessage);
    }
}

// Absolute path shapes (Windows drive, UNC, posix with at least two segments). Kept in sync with the
// downstream telemetry sanitizer so both layers reduce paths the same way.
const ABSOLUTE_PATH =
    /\b[a-z]:[\\/][^\s'"`,;)\]}]{0,2000}|\\\\[^\s'"`,;)\]}]{1,2000}|(?<![\w.:<>~-])(?:\/[^\s/'"`,;)\]}]+){2,}/gi;

/**
 * Reduce a filesystem path to the name of the file it points to, so no directory is reported. Directories can
 * contain user, customer or workspace names (personal data), so only the last segment is kept, and only when it
 * is a file (has an extension) or a dotfile/dotfolder (`.vscode`, `.gitignore`). A path that ends in a plain
 * folder is removed entirely.
 *
 * @param pathLike - a filesystem path
 * @returns the file name, or an empty string if the path ends in a folder
 */
export function pathToFilename(pathLike: string): string {
    const lastSegment = pathLike.split(/[\\/]/).filter(Boolean).pop();
    if (!lastSegment) {
        return '';
    }
    const isFile = lastSegment.startsWith('.') || /\.\w+$/.test(lastSegment);
    return isFile ? lastSegment : '';
}

/**
 * Remove absolute paths from any text, reducing each to its file name (folders dropped). Use on a raw error
 * message before it is reported, so no absolute path reaches telemetry.
 *
 * @param text - text that may contain absolute paths
 * @returns the text with every absolute path reduced to a file name
 */
export function stripPaths(text: string): string {
    return text.replaceAll(ABSOLUTE_PATH, (match) => pathToFilename(match));
}

/**
 * Turn a caught error into a path-free description for telemetry. A Node file system error exposes a path-free
 * `code` (`ENOENT`, `EACCES`, `EBUSY`, `EEXIST`, `EPERM`); it is reported with the code and the offending file
 * name only. Any other error has its absolute paths stripped as a safety net.
 *
 * @param error - caught error of unknown type
 * @param context - short prefix describing what failed, for example `Error committing migration`
 * @returns `${context}: <curated, path-free detail>`
 */
export function curateErrorDescription(error: unknown, context: string): string {
    const err = error instanceof Error ? error : new Error(String(error));
    const code = (err as NodeJS.ErrnoException).code;
    const detail = stripPaths(err.message);
    return code && !detail.includes(code) ? `${context}: ${code}: ${detail}` : `${context}: ${detail}`;
}

/**
 * Determine error message based on error type.
 * Always returns a non-empty string with fallback to error.message.
 *
 * @param error - The error object
 * @param filename - Optional filename context for file-specific errors
 * @param useMessage - Whether to use the raw error message
 * @returns A user-friendly error message, or the original error message as fallback
 */
export function determineMessage(error: Error, filename?: string, useMessage?: boolean): string {
    let errorMessage = '';
    if (filename) {
        errorMessage = i18nText('ERROR_READING_FILE', { filename });
    } else if (useMessage) {
        errorMessage = error.message;
    }

    if (error.name === 'SyntaxError') {
        errorMessage = i18nText(filename ? 'ERROR_SYNTAX_FILENAME' : 'ERROR_SYNTAX', { filename });
    } else if (error.message.includes('EPERM')) {
        errorMessage = i18nText(filename ? 'ERROR_PERMISSION_FILE' : 'ERROR_PERMISSION', { filename });
    }

    // Fallback to a path-free form of the original message so no absolute path is reported
    return errorMessage || stripPaths(error.message) || error.toString();
}

/**
 * Generate template file using EJS and template utilities
 *
 * @param fs - mem-fs editor
 * @param templateData
 * @param projectRoot
 * @param templateRoot
 * @param templateName
 * @param templateProps
 */
export async function generateTemplate(
    fs: Editor,
    templateData: Data,
    projectRoot: string,
    templateRoot: string,
    templateName: string,
    templateProps: TemplateProperties
): Promise<void> {
    // Import template utilities
    const { resolveTemplatePaths, resolveTemplateData, renderTemplate, applyFileSpecificHandlers } =
        await import('./template/index.js');

    // 1. Resolve paths
    const { fullTemplateName, targetFile } = resolveTemplatePaths(
        projectRoot,
        templateRoot,
        templateName,
        templateProps
    );

    // 2. Resolve template data
    const resolvedData = resolveTemplateData(templateData, templateProps);

    // 3. Render template (mem-fs handles directory creation implicitly)
    const { isRendered = true, opts = {} } = templateProps;
    let content = renderTemplate(fs, templateRoot, fullTemplateName, resolvedData, opts, isRendered);

    // 4. Apply file-specific handlers
    content = await applyFileSpecificHandlers(fs, templateName, content, projectRoot, targetFile, templateData);

    // 5. Write file (mem-fs handles directory creation implicitly)
    // Do not catch - let errors propagate to caller for proper handling
    writeFile(fs, targetFile, content);
}

/**
 * Creates the sourceTemplate manifest.json entry.
 * This will respect the existing values if they are defined and not an empty string
 * or make a best effort to set meaningful values otherwise.
 *
 * @param floorplan The floorplan name, to be appended to the source template id
 * @param sourceTemplate Optional - value of the source template setting from manifest.json
 * @returns the source template object
 */
export async function getSourceTemplate(
    floorplan: string,
    sourceTemplate?: SapAppSourceTemplate
): Promise<Manifest['sap.app']['sourceTemplate']> {
    // Determine the package version. When bundled this will be app-modeler since app-migrator is bundled and it's package.json removed.
    // This vesions are always aligned regardless.
    const packageInfo = await readPackageUpAsync({ cwd: __dirname, normalize: false });

    // Only where manifest.json values are not provided will the test values be
    // used during tests to avoid changing values in snapshots
    return {
        id: sourceTemplate?.id || `@sap/ux-app-migrator:${floorplan}`,
        version: sourceTemplate?.version || packageInfo?.packageJson.version || '',
        toolsId: sourceTemplate?.toolsId || generateToolsId() // Existing toolsIds will be overwritten
    };
}

/**
 * Generates a v4 uuid. While not strictly necessary to wrap uuid it means we can enforce
 * additional options or change implementation easily in future.
 *
 * @returns a uuid v4 string
 */
export function generateToolsId(): string {
    return uuidV4();
}

/**
 * Determine SAP UX layer based on project type
 * Internal projects use VENDOR layer, external use CUSTOMER_BASE
 *
 * @param isInternal - Whether the project is internal (SAP-developed)
 * @returns SAP UX layer identifier
 */
export function determineSapUxLayer(isInternal: boolean): UI5FlexLayer {
    return isInternal ? 'VENDOR' : 'CUSTOMER_BASE';
}

/**
 * Format a string url parameter from the input arguments. Accepts empty string as input arguments.
 *
 * @example
 * ```typescript
 * const sapClientParam = 'sap-client=010';
 * const urlParam = buildUrlParam(sapClientParam, disableCacheParam);
 * // urlParam: '?sap-client=010&sap-ui-xx-viewCache=false'
 * ```
 * @example
 * ```typescript
 * const sapClientParam = '';
 * const urlParam = buildUrlParam(sapClientParam, disableCacheParam);
 * // urlParam: '?sap-ui-xx-viewCache=false'
 * ```
 * @param params A list of arguments, each is a url param key value pair.
 * E.g. 'sap-client=010', 'sap-ui-xx-viewCache=false'. Empty string argument is allowed,
 * but will be filtered in the output.
 * @returns Concated url params that removes empty input args.
 */
export function buildUrlParam(...params: string[]): string {
    const nonEmptyParams = params.filter((param) => !!param);
    if (nonEmptyParams.length === 0) {
        return '';
    } else {
        return `?${nonEmptyParams.join('&')}`;
    }
}
