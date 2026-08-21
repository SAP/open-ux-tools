/**
 * Migration phase functions extracted from ProjectMigrator.copyCommonFiles
 * Each phase represents a focused step in the migration process
 *
 * This extraction reduces cognitive complexity and improves testability
 */

import type { ImportProjectInfo, Message, TemplateData, NeoappDestination } from '../types.js';
import type { SapAppSourceTemplate } from '../project-spec-types.js';
import { FioriElementsVersion } from '../project-spec-types.js';
import { MigrationTypes, distVar } from '../utils/constants.js';
import { join } from 'node:path';
import { TemplateFileName, templatesDirPath } from '../index.js';

import { migrateLegacyFolderStructure } from './legacy.js';
import { setupMigrationDirectories, removePackageLock } from './setup.js';
import { validateAndReportMetadata, handleExtensionProjectConfig } from './validation.js';

import { createExtensionProjectManifest, createWebappFolderAndMigrateFiles } from '../files/index.js';

import { applyBaseTemplates, applyApplicationTemplates } from '../template/index.js';
import { generateAllUI5YamlFiles, updateManifestForMigration, generateLaunchConfiguration } from '../config/index.js';

/**
 * Configuration for generating app settings phase
 */
export interface GenerateAppSettingsConfig {
    rootPath: string;
    templateData: TemplateData;
    destination: string;
    webappPath: string;
    messages: Message[];
    sourceTemplateType: string;
    hasDataSource: boolean;
    neoappDestinations?: NeoappDestination[];
    sourceTemplateTest?: SapAppSourceTemplate;
    firstNeoAppDestination?: string;
}

/**
 * Configuration for applying all templates phase
 */
export interface ApplyAllTemplatesConfig {
    projectInfo: ImportProjectInfo;
    rootPath: string;
    templateData: TemplateData;
    hasDataSource: boolean;
    finalKeepIndex: boolean;
    internalToggle: boolean;
    ui5Version: string | undefined;
    isSAPApp: boolean;
    appIntent: string;
    appMockIntent: string | undefined;
}

/**
 * Configuration for post-processing migration phase
 */
export interface PostProcessMigrationConfig {
    projectInfo: ImportProjectInfo;
    rootPath: string;
    manifestJSON: any;
    vscode: any;
    appIntent: string | undefined;
    appMockIntent: string | undefined;
    flpSandboxAvailable: boolean;
    messages: Message[];
}

/**
 * Phase 1: Setup project structure
 * - Migrate legacy folder structure if needed
 * - Create extension project manifest
 * - Create webapp folder and migrate files
 *
 * @param projectInfo - Project information
 * @param rootPath - Project root path
 * @returns Updated webapp path and keepIndex flag
 */
export async function setupProjectStructure(
    projectInfo: ImportProjectInfo,
    rootPath: string
): Promise<{ webappPath: string; keepIndex: boolean }> {
    // Migrate from FF legacy folder structure (/src/main) if applicable
    const { keepIndex, webappPath: updatedWebappPath } = await migrateLegacyFolderStructure(projectInfo, rootPath);

    // Update projectInfo with the new webapp path if it changed
    if (updatedWebappPath !== projectInfo.webappPath) {
        projectInfo.webappPath = updatedWebappPath;
    }

    // Create extension project manifest if needed
    await createExtensionProjectManifest(rootPath, projectInfo);

    // Create webapp folder and migrate files if needed
    await createWebappFolderAndMigrateFiles(rootPath, projectInfo);

    // Return the final webapp path (which is now in projectInfo) and keepIndex
    return { webappPath: projectInfo.webappPath, keepIndex };
}

/**
 * Phase 2: Generate app settings
 * - Generate UI5 YAML files (ui5.yaml, ui5-local.yaml, ui5-mock.yaml)
 * - Update manifest.json with migration changes
 *
 * @param config - Configuration object containing all required parameters
 */
export async function generateAppSettings(config: GenerateAppSettingsConfig): Promise<void> {
    const {
        rootPath,
        templateData,
        destination,
        webappPath,
        messages,
        sourceTemplateType,
        hasDataSource,
        neoappDestinations,
        sourceTemplateTest,
        firstNeoAppDestination
    } = config;
    const templateRoot = join(templatesDirPath, TemplateFileName.AppSettings);

    // Determine if UI5 version should be written to YAML files
    const setUI5version: boolean =
        (templateData.project.manifestUI5Version !== templateData.project.ui5Version &&
            !(templateData.project.ui5Version === '' && templateData.project.manifestUI5Version === distVar)) ||
        (!templateData.project.manifestUI5Version && templateData.project.ui5Version === '');

    // Generate all UI5 YAML files
    await generateAllUI5YamlFiles({
        templateData,
        neoappDestinations,
        messages,
        destination,
        firstNeoAppDestination,
        webappPath,
        setUI5version,
        rootPath,
        templateRoot,
        hasDataSource
    });

    // Update manifest.json
    await updateManifestForMigration(
        rootPath,
        webappPath,
        templateData,
        sourceTemplateType,
        messages,
        sourceTemplateTest
    );
}

/**
 * Phase 3: Apply all templates
 * - Setup migration directories
 * - Apply base templates
 * - Apply application-specific templates
 * - Remove package-lock.json
 *
 * @param config - Configuration object containing all required parameters
 */
export async function applyAllTemplates(config: ApplyAllTemplatesConfig): Promise<void> {
    const {
        projectInfo,
        rootPath,
        templateData,
        hasDataSource,
        finalKeepIndex,
        internalToggle,
        ui5Version,
        isSAPApp,
        appIntent,
        appMockIntent
    } = config;
    // Setup env i.e. create necessary directories, if they don't already exist
    await setupMigrationDirectories(projectInfo, rootPath, hasDataSource);

    // Apply base application templates
    await applyBaseTemplates({
        projectInfo,
        templateData,
        rootPath,
        keepIndex: finalKeepIndex,
        internalToggle,
        ui5Version,
        FioriElementsVersionEnum: FioriElementsVersion
    });

    // Apply specific application templates
    await applyApplicationTemplates({
        projectInfo,
        templateData,
        rootPath,
        appIntent,
        appMockIntent,
        hasDataSource,
        isSAPApp,
        ui5Version,
        MigrationTypesEnum: MigrationTypes,
        FioriElementsVersionEnum: FioriElementsVersion
    });

    // Remove package-lock if exists
    await removePackageLock(projectInfo.rootPath);
}

/**
 * Phase 4: Post-processing
 * - Validate metadata
 * - Generate launch configuration OR handle extension project config
 *
 * @param config - Configuration object containing all required parameters
 */
export async function postProcessMigration(config: PostProcessMigrationConfig): Promise<void> {
    const { projectInfo, rootPath, manifestJSON, vscode, appIntent, appMockIntent, flpSandboxAvailable, messages } =
        config;
    // Validate metadata and add warning if missing
    await validateAndReportMetadata(rootPath, projectInfo, manifestJSON, messages);

    if (projectInfo.type !== MigrationTypes.projectExtension) {
        // Generate Launch Config using @sap-ux/launch-config
        await generateLaunchConfiguration(projectInfo, vscode, appIntent, appMockIntent, flpSandboxAvailable, messages);
    } else {
        // Handle extension project configuration
        await handleExtensionProjectConfig(rootPath, projectInfo);
    }
}
