import type { Editor } from 'mem-fs-editor';
import { t } from './i18n.js';
import RepoAppDownloadLogger from './logger.js';
import type { QfaJsonConfig, AbapRepoAppConfig } from '../app/types.js';
import { PromptState } from '../prompts/prompt-state.js';
import { join } from 'node:path';
import { TemplateType as FioriElementsTemplateType } from '@sap-ux/fiori-elements-writer';
import { TemplateType as FioriFreestyleTemplateType } from '@sap-ux/fiori-freestyle-writer';
import { FileName, type Manifest } from '@sap-ux/project-access';
import type { Floorplan } from '@sap-ux/fiori-generator-shared';

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
 * Removes build artefacts from the extracted project that should not be present in a local development project.
 * Handles debug files (-dbg.js), preload bundles, source maps, and transpiled JS files for TypeScript apps.
 * For -dbg.js files, copies the unminified content to the corresponding .js file first.
 *
 * @param {string} extractedProjectPath - The path where the app files are extracted.
 * @param {Editor} fs - The file system editor.
 */
export function cleanupArtifacts(extractedProjectPath: string, fs: Editor): void {
    const dbgSuffix = '-dbg.';
    const entries = PromptState.admZip?.getEntries() ?? [];
    const tsEntryNames = new Set(
        entries.filter((e) => e.entryName.endsWith('.ts') && !e.entryName.endsWith('.d.ts')).map((e) => e.entryName)
    );

    entries.forEach((entry) => {
        const name = entry.entryName;

        // Replace debug variants (e.g. component-dbg.js) with their non-debug counterpart
        if (name.includes(dbgSuffix)) {
            const extractedDebugPath = join(extractedProjectPath, name.replace(dbgSuffix, '.'));
            const debugPath = join(extractedProjectPath, name);
            fs.write(extractedDebugPath, entry.getData().toString('utf8'));
            fs.delete(debugPath);
            RepoAppDownloadLogger.logger?.debug(
                `cleanupArtifacts: Copied "${debugPath}" -> "${extractedDebugPath}" and removed debug file`
            );
            return;
        }

        // Remove preload bundles and source maps — not needed for local development
        if (name.endsWith('-preload.js') || name.endsWith('.js.map')) {
            const filePath = join(extractedProjectPath, name);
            if (fs.exists(filePath)) {
                fs.delete(filePath);
                RepoAppDownloadLogger.logger?.debug(`cleanupArtifacts: Removed preload/map file: "${filePath}"`);
            }
            return;
        }

        // Remove transpiled .js files that have a .ts counterpart — TypeScript source takes precedence
        if (tsEntryNames.size > 0 && name.endsWith('.js') && tsEntryNames.has(`${name.slice(0, -3)}.ts`)) {
            const filePath = join(extractedProjectPath, name);
            if (fs.exists(filePath)) {
                fs.delete(filePath);
                RepoAppDownloadLogger.logger?.debug(`cleanupArtifacts: Removed transpiled file: "${filePath}"`);
            }
        }
    });
}

/**
 * Writes a minimal package.json to the project path if one does not already exist.
 *
 * @param {string} projectPath - The project root path.
 * @param {AbapRepoAppConfig} appConfig - The app configuration.
 * @param {Editor} fs - The file system editor.
 */
export function addPackageJsonIfNotFound(projectPath: string, appConfig: AbapRepoAppConfig, fs: Editor): void {
    const packageJsonPath = join(projectPath, FileName.Package);
    if (!fs.exists(packageJsonPath)) {
        const packageJson: { name: string } = { name: appConfig.app.id };
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
export function getTemplateTypeFromManifest(manifest: Manifest): Floorplan | 'unknown' {
    const sourceTemplateId: string = manifest?.['sap.app']?.sourceTemplate?.id ?? '';
    const fioriGeneratorPrefix = '@sap/generator-fiori:';
    // set of all known @sap/generator-fiori template suffixes for validating sourceTemplate.id in manifest.json.
    const knownTemplates = new Set<string>([
        ...Object.values(FioriElementsTemplateType),
        ...Object.values(FioriFreestyleTemplateType)
    ]);

    if (!sourceTemplateId.startsWith(fioriGeneratorPrefix)) {
        return 'unknown';
    }
    const suffix = sourceTemplateId.slice(fioriGeneratorPrefix.length) as Floorplan;
    return knownTemplates.has(suffix) ? suffix : 'unknown';
}
