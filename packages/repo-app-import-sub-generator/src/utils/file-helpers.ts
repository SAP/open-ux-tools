import type { Editor } from 'mem-fs-editor';
import { t } from './i18n.js';
import RepoAppDownloadLogger from './logger.js';
import type { QfaJsonConfig, AbapRepoAppConfig } from '../app/types.js';
import { PromptState } from '../prompts/prompt-state.js';
import { join } from 'node:path';
import { TemplateType as FioriElemenetsTemplateType } from '@sap-ux/fiori-elements-writer';
import { TemplateType as FioriFreestyleTemplateType } from '@sap-ux/fiori-freestyle-writer';
import { FileName, type Manifest } from '@sap-ux/project-access';

/**
 *
 * @param filePath - Path to the JSON file
 * @param fs - File system editor instance
 * @returns - Parsed JSON object
 */
export function makeValidJson(filePath: string, fs: Editor): QfaJsonConfig {
    try {
        // Read the file contents
        const fileContents = fs.read(filePath);
        const validJson: QfaJsonConfig = JSON.parse(fileContents);
        return validJson;
    } catch (error) {
        throw new Error(t('error.errorProcessingJsonFile', { error }));
    }
}

/**
 * Reads and validates the `manifest.json` file.
 *
 * @param {string} manifestFilePath - Manifest file path.
 * @param {Editor} fs - The file system editor.
 * @returns {Manifest} The validated manifest object.
 */
export function readManifest(manifestFilePath: string, fs: Editor): Manifest {
    if (!fs.exists(manifestFilePath)) {
        RepoAppDownloadLogger.logger?.error(t('error.readManifestErrors.manifestFileNotFound'));
    }
    const manifest = fs.readJSON(manifestFilePath) as unknown as Manifest;
    if (!manifest) {
        RepoAppDownloadLogger.logger?.error(t('error.readManifestErrors.readManifestFailed'));
    }
    if (!manifest?.['sap.app']) {
        RepoAppDownloadLogger.logger?.error(t('error.readManifestErrors.sapAppNotDefined'));
    }
    return manifest;
}

/**
 * Removes debug, preload, and source map files from the extracted project path.
 * For -dbg.js files, copies the unminified content to the corresponding .js file first.
 * These files are build artefacts that cause issues with the UI5 CLI build if left in place.
 *
 * @param {string} extractedProjectPath - The path where the app files are extracted.
 * @param {Editor} fs - The file system editor.
 */
export function processDebugArtifacts(extractedProjectPath: string, fs: Editor): void {
    PromptState.admZip?.getEntries().forEach((entry) => {
        const name = entry.entryName;
        if (name.includes('-dbg.')) {
            // copies contents of -dbg.js to .js file and removes the -dbg.js file
            const extractedDebugPath = join(extractedProjectPath, name.replace('-dbg.', '.'));
            const debugPath = join(extractedProjectPath, name);
            fs.write(extractedDebugPath, entry.getData().toString('utf8'));
            fs.delete(debugPath);
            RepoAppDownloadLogger.logger?.debug(
                `processDebugArtifacts: Copied "${debugPath}" -> "${extractedDebugPath}" and removed debug file`
            );
        } else if (name.endsWith('-preload.js') || name.endsWith('.js.map')) {
            const filePath = join(extractedProjectPath, name);
            if (fs.exists(filePath)) {
                fs.delete(filePath);
                RepoAppDownloadLogger.logger?.debug(`processDebugArtifacts: Removed file: "${filePath}"`);
            }
        }
    });
}

/**
 * Writes a minimal package.json to the project path if one does not already exist.
 * Sets `sapux: true` for all apps except freestyle templates.
 *
 * @param {string} projectPath - The project root path.
 * @param {AbapRepoAppConfig} appConfig - The app configuration.
 * @param {Editor} fs - The file system editor.
 */
export function addPackageJsonIfNotFound(projectPath: string, appConfig: AbapRepoAppConfig, fs: Editor): void {
    const packageJsonPath = join(projectPath, FileName.Package);
    if (!fs.exists(packageJsonPath)) {
        const packageJson: Record<string, unknown> = { name: appConfig.app.id };
        const freestyleTemplates = new Set<string>(Object.values(FioriFreestyleTemplateType));
        if (!freestyleTemplates.has(appConfig.template.type)) {
            packageJson['sapux'] = true;
        }
        fs.writeJSON(packageJsonPath, packageJson);
    }
}

/**
 * Derives the template type string from a manifest's sourceTemplate id.
 * Returns the suffix after `@sap/generator-fiori:` (e.g. `lrop`, `fpm`),
 * or `'unknown'` if the id is absent or is not a fiori generated app.
 *
 * @param {Manifest} manifest - The parsed manifest object.
 * @returns {string} The template type string.
 */
export function getTemplateTypeFromManifest(manifest: Manifest): string {
    const sourceTemplateId: string = manifest?.['sap.app']?.sourceTemplate?.id ?? '';
    const fioriGeneratorPrefix = '@sap/generator-fiori:';
    // set of all known @sap/generator-fiori template suffixes for validating sourceTemplate.id in manifest.json.
    const knownTemplates = new Set<string>([
        ...Object.values(FioriElemenetsTemplateType),
        ...Object.values(FioriFreestyleTemplateType)
    ]);

    if (!sourceTemplateId.startsWith(fioriGeneratorPrefix)) {
        return 'unknown';
    }
    const suffix = sourceTemplateId.slice(fioriGeneratorPrefix.length);
    return knownTemplates.has(suffix) ? suffix : 'unknown';
}
