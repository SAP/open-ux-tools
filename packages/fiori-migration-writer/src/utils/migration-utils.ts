import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promises as fsPromises } from 'node:fs';
import type { Data } from 'ejs';
import type { Manifest, SapAppSourceTemplate } from '../project-spec-types.js';
import { readPackageUpSync } from 'read-pkg-up';
import { v4 as uuidV4 } from 'uuid';
import type { TemplateProperties, SapUxLayer } from '../types.js';
import { i18nText } from '../i18n.js';

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
    let libStrOut = '';
    const mlibs = Object.keys(manifestLibs || {});
    // remove spaces and split at comma
    const strlibs = libsStrInput?.replace(/ /g, '').split(',') || [];
    const libs = mlibs.concat(strlibs);
    const uniquelibs = libs.filter((v, i, a) => a.indexOf(v) === i);

    libStrOut = uniquelibs.filter((ele) => sapLibsRegexFilter.test(ele)).join(', ');

    return libStrOut;
}

/**
 * Custom error class for migration errors
 */
export class MigrationError extends Error {
    private readonly useMessage: boolean;
    constructor(error: Error, filename?: string, useMessage?: boolean) {
        super(error.message);
        this.useMessage = useMessage ?? false;
        this.name = 'MigrationError';

        this.setMessage(error, filename);
    }

    private setMessage(error: Error, filename?: string) {
        this.message = determineMessage(error, filename, this.useMessage);
    }
}

/**
 * Determine error message based on error type
 *
 * @param error
 * @param filename
 * @param useMessage
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
    return errorMessage;
}

/**
 * Generate template file using EJS and template utilities
 *
 * @param templateData
 * @param projectRoot
 * @param templateRoot
 * @param templateName
 * @param templateProps
 */
export async function generateTemplate(
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

    // 3. Ensure target directory exists
    await fsPromises.mkdir(dirname(targetFile), { recursive: true });

    // 4. Render template
    const { isRendered = true, opts = {} } = templateProps;
    let content = await renderTemplate(templateRoot, fullTemplateName, resolvedData, opts, isRendered);

    // 5. Apply file-specific handlers
    content = await applyFileSpecificHandlers(templateName, content, projectRoot, targetFile, templateData);

    // 6. Write file
    try {
        await fsPromises.writeFile(targetFile, content);
    } catch (e) {
        console.log(`Error writing file ${targetFile} - ${e}`);
    }
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
export function getSourceTemplate(
    floorplan: string,
    sourceTemplate?: SapAppSourceTemplate
): Manifest['sap.app']['sourceTemplate'] {
    // Determine the package version. When bundled this will be app-modeler since app-migrator is bundled and it's package.json removed.
    // This vesions are always aligned regardless.
    const packageInfo = readPackageUpSync({ cwd: __dirname, normalize: false });

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
export function determineSapUxLayer(isInternal: boolean): SapUxLayer {
    return (isInternal ? 'VENDOR' : 'CUSTOMER_BASE') as SapUxLayer;
}

/**
 * Build SAP client parameter string
 *
 * @param sapClient
 */
export function buildSapClientParam(sapClient: string): string {
    return sapClient ? `sap-client=${sapClient}` : '';
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
