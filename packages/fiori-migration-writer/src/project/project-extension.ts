/**
 * Helper functions for processing project extension configuration
 */
import { join } from 'node:path';
import { DirName } from '../project-spec-types.js';
import type { Manifest, Package } from '../project-spec-types.js';
import type { ImportProjectInfo, NeoappDestination } from '../types.js';
import { MigrationTypes } from '../utils/constants.js';
import { getMinUI5VersionAsArray } from '@sap-ux/project-access';

/**
 * Configuration for processing project extension
 */
export interface ProcessProjectExtensionConfig {
    projectRoot: string;
    defaultProjectInfo: ImportProjectInfo;
    projectInfo: ImportProjectInfo;
    manifest: Manifest | undefined;
    getPackageJson: (projectRoot: string) => Promise<Package>;
    hasUI5Tooling: (packageJson: Package) => boolean;
    readProjectExtensionSettings: (projectRoot: string) => Promise<any>;
    getExtensionProjectModuleName: (
        projectRoot: string,
        extensionProjectSettings: any,
        manifest: Manifest | undefined
    ) => string;
    getDestinationFromNeoApp: (
        projectRoot: string,
        destination: string
    ) => Promise<
        | {
              destination?: string;
              neoAppUI5Version?: string;
              neoappDestinations?: NeoappDestination[];
          }
        | undefined
    >;
    getFirstBackend: (projectRoot: string) => Promise<
        | {
              destination?: string;
              scp?: boolean;
              url?: string;
              sapClient?: string;
          }
        | undefined
    >;
    getClientFromDestinationName: (destination: string) => string;
    getFlpIntentFromHtml: (path: string) => Promise<string | undefined>;
    getManifestJson: (projectRoot: string, webappPath: string) => Promise<Manifest>;
}

/**
 * Process project extension to build projectInfo
 * Handles extension-specific configuration including settings, destinations, and versioning
 *
 * @param config - Configuration object containing all required parameters
 * @returns Project info for project extension
 */
export async function processProjectExtension(config: ProcessProjectExtensionConfig): Promise<ImportProjectInfo> {
    const {
        projectRoot,
        defaultProjectInfo,
        projectInfo,
        manifest,
        getPackageJson,
        hasUI5Tooling,
        readProjectExtensionSettings,
        getExtensionProjectModuleName,
        getDestinationFromNeoApp,
        getFirstBackend,
        getClientFromDestinationName,
        getFlpIntentFromHtml,
        getManifestJson
    } = config;
    let packageJSON: Package;
    let hasUI5ToolingDep = false;
    try {
        packageJSON = await getPackageJson(projectRoot);
        hasUI5ToolingDep = hasUI5Tooling(packageJSON);
    } catch {
        // Expected: package.json may not exist in legacy WebIDE extension projects.
        // Safe to continue - packageJSON will be generated during migration.
    }

    const extensionProjectSettings = await readProjectExtensionSettings(projectRoot);
    const moduleName = getExtensionProjectModuleName(projectRoot, extensionProjectSettings, manifest);
    const neoAppData = await getDestinationFromNeoApp(projectRoot, projectInfo.destination);
    let destination: string | undefined;
    let hostname = '';
    let sapClient = '';
    const ui5Backend = await getFirstBackend(projectRoot);
    destination = ui5Backend?.destination ?? destination;
    const scp = ui5Backend?.scp;
    sapClient = ui5Backend?.sapClient ?? sapClient;
    hostname = ui5Backend?.url ?? hostname;

    let neoAppUI5Version: string | undefined = '';
    let neoappDestinations: NeoappDestination[] = [];
    if (neoAppData?.destination) {
        destination = neoAppData.destination;
    }
    const firstNeoAppDestination = destination;
    neoAppUI5Version = neoAppData?.neoAppUI5Version;
    const ui5Version = neoAppData?.neoAppUI5Version;
    sapClient = getClientFromDestinationName(destination as string) ?? sapClient;

    if (neoAppData?.neoappDestinations) {
        neoappDestinations = neoAppData.neoappDestinations;
    }

    const indexHtmlPath = join(projectRoot, projectInfo.webappPath, 'index.html');
    const intent = await getFlpIntentFromHtml(indexHtmlPath);
    if (intent) {
        projectInfo.flpSandboxFlpIntent = `#${intent}`;
    }
    let appVersion = '2.0.0';
    try {
        appVersion = (await getPackageJson(projectRoot))?.version ?? '2.0.0';
    } catch {
        try {
            appVersion = (await getManifestJson(projectRoot, DirName.Webapp))?.['sap.app']?._version as string;
        } catch {
            // do nothing, may not have a package.json
        }
    }
    const result: ImportProjectInfo = {
        ...defaultProjectInfo,
        ...{
            moduleName,
            isSAPApp: true,
            ui5Theme: projectInfo?.supportedThemes?.includes('sap_fiori_3') ? 'sap_fiori_3' : 'sap_bluecrystal',
            isFioriToolsProject: hasUI5ToolingDep,
            ...{ rootPath: projectRoot, type: MigrationTypes.projectExtension },
            destination: destination as string,
            scp: scp as boolean,
            sapClient,
            hostname,
            firstNeoAppDestination,
            neoAppUI5Version,
            neoappDestinations,
            extensionProjectSettings,
            ui5Version,
            appVersion
        }
    };
    if (manifest) {
        result.manifestUI5Version = getMinUI5VersionAsArray(manifest, true)[0] || '';
    }

    return result;
}
