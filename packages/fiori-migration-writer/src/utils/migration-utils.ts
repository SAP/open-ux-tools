import { dirname, isAbsolute, relative, basename, sep } from 'node:path';
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
    /** Error code of the original error, for example `EPERM` for file system errors. */
    readonly code?: string;
    constructor(error: unknown, filename?: string, useMessage?: boolean) {
        const msg = error instanceof Error ? error.message : String(error);
        super(msg);
        this.useMessage = useMessage ?? false;
        this.name = 'MigrationError';
        this.code = getErrorCode(error);

        const errorObj = error instanceof Error ? error : new Error(msg);
        this.setMessage(errorObj, filename);
    }

    private setMessage(error: Error, filename?: string) {
        this.message = determineMessage(error, filename, this.useMessage);
    }
}

/**
 * Steps of the migration. They are added to errors, so the failing step can be reported.
 */
export const MigrationStep = {
    loadProject: 'loadProject',
    loadProjectInfo: 'loadProjectInfo',
    resolveUI5Versions: 'resolveUI5Versions',
    validateProject: 'validateProject',
    detectTypeScript: 'detectTypeScript',
    prepareConfiguration: 'prepareConfiguration',
    setupProjectStructure: 'setupProjectStructure',
    assembleTemplateData: 'assembleTemplateData',
    generateAppSettings: 'generateAppSettings',
    applyTemplates: 'applyTemplates',
    postProcessing: 'postProcessing',
    setupTypeScript: 'setupTypeScript'
} as const;
export type MigrationStep = (typeof MigrationStep)[keyof typeof MigrationStep];

/**
 * Run a step of the migration. An error that is thrown by the step is marked with the step, unless it already
 * has one. The error itself is not changed otherwise.
 *
 * @param step - the step
 * @param action - the action to run
 * @returns the result of the action
 */
export async function runMigrationStep<T>(step: MigrationStep, action: () => Promise<T> | T): Promise<T> {
    try {
        return await action();
    } catch (error) {
        if (typeof error === 'object' && error !== null && !('migrationStep' in error)) {
            // Not enumerable, so the error looks the same when it is logged or serialized
            Object.defineProperty(error, 'migrationStep', { value: step, enumerable: false });
        }
        throw error;
    }
}

/**
 * Get the error code of a Node.js error, for example `EPERM` or `ENOSPC`.
 *
 * @param error - the error
 * @returns the code, if the error has one
 */
export function getErrorCode(error: unknown): string | undefined {
    const code = (error as { code?: unknown } | undefined)?.code;
    return typeof code === 'string' && code.length > 0 ? code : undefined;
}

/**
 * Check if an error is a permission error of the file system.
 *
 * @param error - the error
 * @returns true if the error is an `EPERM` or `EACCES` error
 */
function isPermissionError(error: Error): boolean {
    const code = getErrorCode(error);
    const message = String(error.message ?? '');
    return ['EPERM', 'EACCES'].some((permissionCode) => code === permissionCode || message.includes(permissionCode));
}

/**
 * Get the file an error is about, relative to the project. Only file system errors know their file. A file outside
 * of the project is reduced to its name, so no absolute path is reported.
 *
 * @param error - the error
 * @param projectRoot - absolute path of the project
 * @returns the file with `/` as separator, if the error has one
 */
export function getErrorFile(error: unknown, projectRoot?: string): string | undefined {
    const path = (error as { path?: unknown } | undefined)?.path;
    if (typeof path !== 'string' || path.length === 0) {
        return undefined;
    }
    let file = basename(path);
    if (projectRoot && isAbsolute(path)) {
        const relativePath = relative(projectRoot, path);
        if (relativePath && !relativePath.startsWith('..') && !isAbsolute(relativePath)) {
            file = relativePath;
        }
    } else if (!isAbsolute(path)) {
        file = path;
    }
    return file.split(sep).join('/');
}

/**
 * Convert any value to a string suitable for Error construction.
 * Prevents '[object Object]' stringification.
 *
 * @param value - the value to convert
 * @returns a string representation
 */
function errorValueToString(value: unknown): string {
    if (value == null) {
        return '';
    }
    if (typeof value === 'string') {
        return value;
    }
    if (value instanceof Error) {
        return value.message;
    }
    if (typeof value === 'object') {
        try {
            return JSON.stringify(value);
        } catch {
            // Fallback for objects that can't be stringified (circular refs, etc.)
            return Object.prototype.toString.call(value);
        }
    }
    return String(value);
}

/**
 * Get error message text based on error type and file context.
 *
 * @param err - the error object
 * @param file - optional file path
 * @param useMessage - whether to use raw error message
 * @returns the error message text
 */
function getErrorMessageText(err: Error, file: string | undefined, useMessage?: boolean): string {
    if (err.name === 'MigrationError') {
        return err.message;
    }
    if (err.name === 'SyntaxError') {
        return i18nText(file ? 'ERROR_SYNTAX_FILENAME' : 'ERROR_SYNTAX', { filename: file });
    }
    if (isPermissionError(err)) {
        return i18nText(file ? 'ERROR_PERMISSION_FILE' : 'ERROR_PERMISSION', { filename: file });
    }
    return (useMessage ? err.message : '') || err.message || err.toString();
}

/**
 * Check if technical details should be added to error message.
 *
 * @param err - the error object
 * @param useMessage - whether raw message was requested
 * @returns true if technical details should be omitted
 */
function shouldOmitTechnicalDetails(err: Error, useMessage?: boolean): boolean {
    return useMessage === true || (err as { useMessage?: boolean }).useMessage === true;
}

/**
 * Build technical details string for error (code and step).
 *
 * @param error - the original error
 * @param text - the error message text
 * @returns array of detail strings
 */
function buildErrorDetails(error: unknown, text: string): string[] {
    const code = getErrorCode(error);
    const step = (error as { migrationStep?: unknown } | undefined)?.migrationStep;
    return [
        code && !text.includes(code) ? `code: ${code}` : undefined,
        typeof step === 'string' ? `step: ${step}` : undefined
    ].filter(Boolean) as string[];
}

/**
 * Describe an error for the user and for telemetry. In addition to what `determineMessage` does, it names the
 * file of file system errors (relative to the project), treats `EACCES` like `EPERM`, and adds the error code and the
 * step of the migration, so the failure can be understood without the original stack trace. The result is never empty.
 *
 * @param error - the error that was thrown, not necessarily an `Error`
 * @param projectRoot - absolute path of the project
 * @param useMessage - whether to use the raw error message. Such a message is a message for the user, technical details are not added
 * @returns the message, for example `A permission error occurred in webapp/Component.js. Ensure the file is accessible. (code: EACCES, step: applyTemplates)`
 */
export function describeError(error: unknown, projectRoot?: string, useMessage?: boolean): string {
    // Error-like objects are accepted as they are, anything else is turned into an error
    const errorString = errorValueToString(error);
    const err = (typeof error === 'object' && error !== null ? error : new Error(errorString)) as Error;
    const file = getErrorFile(error, projectRoot);

    let text = getErrorMessageText(err, file, useMessage);
    text = text || i18nText('ERROR_UNKNOWN');

    // Messages that are written for the user explain themselves, technical details would only add noise
    if (shouldOmitTechnicalDetails(err, useMessage)) {
        return text;
    }

    const details = buildErrorDetails(error, text);
    return details.length > 0 ? `${text} (${details.join(', ')})` : text;
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
    } else if (isPermissionError(error)) {
        errorMessage = i18nText(filename ? 'ERROR_PERMISSION_FILE' : 'ERROR_PERMISSION', { filename });
    }

    // Fallback to original error message if no specific message was determined
    return errorMessage || error.message || error.toString();
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
