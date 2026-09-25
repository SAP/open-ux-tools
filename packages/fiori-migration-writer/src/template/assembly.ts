/**
 * Helper functions for template assembly and configuration creation
 */
import { FileName } from '../project-spec-types.js';
import type { PackageJsonMigrate, TemplateData, Ui5Yaml, TemplateAssemblyContext } from '../types.js';
import { readManifest, MigrationError, devDependencies, ui5Dependencies, v4MockServerDep } from '../utils/index.js';
import { buildUrlParam, disableCacheParam } from '../utils/common.js';
import { prepareFlpConfiguration } from '../config/flp/intent.js';
import { generatePackageJsonConfig } from '../config/package-json.js';
import { createUi5YamlConfig, createTemplateData, addV4MockMiddleware, setProjectAppId } from './data.js';

/**
 * Result of template assembly process
 */
export interface AssembledTemplateData {
    packageJson: PackageJsonMigrate;
    ui5Yaml: Ui5Yaml;
    templateData: TemplateData;
    flpSandboxAvailable: boolean;
    appIntent: string | undefined;
    appMockIntent: string | undefined;
    hasDataSource: boolean;
    keepIndex: boolean;
    manifestJSON: any;
}

/**
 * Assemble all template data and configurations needed for migration
 * This consolidates package.json, ui5.yaml, template data creation, and middleware setup
 *
 * @param context - Template assembly context containing all configuration
 * @returns Assembled template data and configurations
 */
export async function assembleTemplateData(context: TemplateAssemblyContext): Promise<AssembledTemplateData> {
    const {
        projectInfo,
        rootPath,
        projectData,
        serviceData,
        config,
        moduleInfo,
        ui5Config,
        backendConfig,
        libraryConfig,
        flags
    } = context;

    // Extract configuration values
    const {
        semanticObject,
        fullyQualifiedProjectName,
        fullyQualifiedProjectNameAMD,
        sapUiLibs,
        ui5Theme,
        sapClientParam
    } = config;
    const { moduleName, moduleDescription, destination } = moduleInfo;
    const { projectUI5Version, localUI5Version, ui5Version, ui5SnapshotUrl, ui5VersionRequestInfo } = ui5Config;
    const { baseUri, scp, sapClient } = backendConfig;
    const { sapLibs, baseUiLibsStr, supportedThemes } = libraryConfig;
    const { keepIndex, internalToggle, hasRootIntent, floorPlan } = flags;

    const isSAPApp = projectInfo.isSAPApp || false;
    const testFlpSandboxHtml = 'test/flpSandbox.html';

    // Prepare FLP sandbox configuration and intents
    const { flpSandboxAvailable, appIntent, appMockIntent } = await prepareFlpConfiguration(
        projectInfo,
        semanticObject
    );

    // Generate URL parameters for different scenarios
    const urlParam = buildUrlParam(sapClientParam, disableCacheParam);
    const variantCmdUrlParam = buildUrlParam(
        sapClientParam,
        disableCacheParam,
        'fiori-tools-rta-mode=true',
        'sap-ui-rta-skip-flex-validation=true'
    );

    // Read manifest.json
    let manifestJSON;
    try {
        manifestJSON = await readManifest(rootPath, projectInfo.webappPath, projectInfo.uiAdaptation);
    } catch (e) {
        throw new MigrationError(e, FileName.Manifest);
    }

    // Check if project has datasource (affects mock and local config inclusion)
    const hasDataSource = !!projectInfo.mainService;

    // Generate package.json configuration
    const devDependenciesTmp = {
        ...devDependencies
    };

    const packageJson: PackageJsonMigrate = await generatePackageJsonConfig({
        projectInfo,
        moduleName,
        moduleDescription,
        sapClient: sapClientParam,
        dependencies: {
            devDependencies: devDependenciesTmp,
            ui5Dependencies,
            v4MockServerDep
        },
        flpConfig: {
            semanticObject,
            appIntent,
            appMockIntent,
            flpSandboxAvailable,
            testFlpSandboxHtml,
            urlParam,
            variantCmdUrlParam
        },
        flags: {
            isSAPApp,
            internalToggle,
            hasDataSource,
            keepIndex,
            floorPlan: floorPlan as string,
            odataVersion: serviceData.version as string
        }
    });

    // Create Ui5Yaml configuration
    const ui5Yaml = createUi5YamlConfig({
        projectInfo,
        moduleName,
        fullyQualifiedProjectName,
        ui5Config: {
            projectUI5Version,
            localUI5Version,
            ui5Version,
            ui5Theme,
            ui5SnapshotUrl,
            ui5VersionRequestInfo
        },
        backendConfig: {
            baseUri,
            scp,
            destination,
            sapClient
        },
        libraryConfig: {
            sapLibs,
            baseUiLibsStr,
            supportedThemes
        }
    });

    // Create template data for EJS templates
    const templateData = createTemplateData({
        projectData,
        serviceData,
        packageJson,
        ui5Yaml,
        semanticObject,
        fullyQualifiedProjectName,
        fullyQualifiedProjectNameAMD,
        sapUiLibs,
        ui5Theme,
        appIntent,
        appMockIntent,
        projectInfo,
        hasRootIntent
    });

    // Add V4 mock middleware configuration if needed
    addV4MockMiddleware({
        templateData,
        serviceData,
        projectInfo,
        projectData,
        ui5Version,
        ui5SnapshotUrl,
        ui5VersionRequestInfo,
        ui5Yaml
    });

    // Set project appId
    setProjectAppId(templateData, fullyQualifiedProjectName);

    return {
        packageJson,
        ui5Yaml,
        templateData,
        flpSandboxAvailable,
        appIntent,
        appMockIntent,
        hasDataSource,
        keepIndex,
        manifestJSON
    };
}
