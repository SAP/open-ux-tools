/**
 * Helper functions for processing regular (non-reuse, non-extension, non-adaptation) projects
 */
import type { ManifestNamespace } from '../project-spec-types.js';
import { getMinUI5VersionAsArray } from '@sap-ux/project-access';
import type { Backend, ImportProjectInfo, Message, NeoappDestination, RegularProjectContext } from '../types.js';
import { MigrationTypes } from '../utils/constants.js';
import { detectMainServiceFromManifest } from '../utils/service-detection.js';
import { extractTemplateDetails } from '../template/details.js';
import { extractBackendAndI18nConfig } from '../config/backend-i18n.js';
import { extractSapLibraries } from '../data/sap-libraries.js';
import { processFlpSandboxFiles } from '../config/flp/sandbox.js';
import { processNeoAppAndODataVersion } from '../config/neoapp.js';
import { determineDefaultFlpIntents } from '../config/flp/intent-defaults.js';
import { generateSapLibsStr, checkManifestUI5Version } from '../utils/common.js';

/**
 * Process a regular Fiori project (not reuse lib, extension, or adaptation)
 * Orchestrates all the helper functions to build complete project info
 *
 * @param context - Regular project processing context with services
 * @returns Project info for regular project and any messages
 */
export async function processRegularProject(
    context: RegularProjectContext
): Promise<{ projectInfo: ImportProjectInfo; messages: Message[] }> {
    const { projectRoot, manifest, defaultProjectInfo, services } = context;
    let projectInfo = context.projectInfo; // Use let since this is reassigned
    const { projectData, manifestAnalysis, backendConfig } = services;

    // Extract service methods
    const { getPackageJson, getMainEntity, hasUI5Tooling } = projectData;
    const { getSemanticObjectAction, getVersionFromManifest, getFloorPlan } = manifestAnalysis;
    const { getFirstBackend, getFlpIntentFromHtml, getDestinationFromNeoApp, getClientFromDestinationName } =
        backendConfig;
    const messages: Message[] = [];
    const backends: Backend[] = [];
    let hostname = (await getFirstBackend(projectRoot))?.url ?? '';
    const mainService = detectMainServiceFromManifest(manifest);

    let flpSandboxFlpIntent = getSemanticObjectAction(manifest);
    let flpSandboxMockFlpIntent: string | undefined;
    let flpSandboxLibs = '';

    let packageJson: any = { name: '', description: '' };
    let appVersion = '';
    let mainServiceDatasource: Partial<ManifestNamespace.DataSource> = {};
    let namespace = '';
    let projectName = '';
    let sapAppId = '';
    let scp: boolean | undefined = false;
    let destination = '';
    let firstNeoAppDestination;
    let appTitle = '';
    let sapClient = '';
    let floorPlan;
    let feVersion;
    let isSAPApp = false;
    let neoAppUI5Version;
    const manifestUI5Version = getMinUI5VersionAsArray(manifest, true)[0] || '';
    let ui5Version = '';
    let neoappDestinations: NeoappDestination[] = [];
    const hasRootIntent = { flpSandboxRootIntent: false, flpSandboxMockRootIntent: false };

    // Step2. Get package.json to determine project properties
    try {
        packageJson = await getPackageJson(projectRoot);
        appVersion = packageJson?.version;
    } catch {
        // Expected: package.json may not exist in legacy WebIDE projects.
        // Safe to extract metadata from manifest.json as fallback - package.json will be generated during migration.
        packageJson.name = manifest?.['sap.app']?.id;
        if (typeof manifest?.['sap.app']?.title === 'string' && !(manifest?.['sap.app']?.title).includes('{{')) {
            packageJson.description = manifest?.['sap.app']?.title;
        }
    }

    // Step3. Get the template details
    try {
        const templateDetails = await extractTemplateDetails(
            manifest,
            projectRoot,
            mainService ?? '',
            appVersion,
            getVersionFromManifest,
            getFloorPlan
        );
        feVersion = templateDetails.feVersion;
        isSAPApp = templateDetails.isSAPApp;
        floorPlan = templateDetails.floorPlan;
        mainServiceDatasource = templateDetails.mainServiceDatasource;
        sapAppId = templateDetails.sapAppId;
        appVersion = templateDetails.appVersion;

        projectName = sapAppId;
        namespace = namespace || '';

        // Extract backend configuration and app title from i18n
        const backendConfig = await extractBackendAndI18nConfig(
            projectRoot,
            projectInfo.webappPath,
            getFirstBackend,
            destination,
            scp,
            hostname,
            sapClient
        );
        // Note: destination will be set from neoAppResult later (line 192)
        scp = backendConfig.scp;
        hostname = backendConfig.hostname;
        sapClient = backendConfig.sapClient;
        appTitle = backendConfig.appTitle;

        // Get the sapLibs - needs to be consistent across the different templates

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const manifestLibsTmp = manifest['sap.ui5']?.dependencies?.libs || {};

        // Extract and filter SAP libraries from manifest
        const { manifestLibs, reuseManifestLibs } = await extractSapLibraries(
            manifestLibsTmp,
            projectRoot,
            projectInfo.webappPath
        );

        // Process FLP sandbox files to extract libs, intents, and root intent flags
        const flpResult = await processFlpSandboxFiles(
            projectRoot,
            projectInfo.webappPath,
            getFlpIntentFromHtml,
            flpSandboxFlpIntent
        );
        // Assign to existing variables
        flpSandboxLibs = flpResult.flpSandboxLibs;
        flpSandboxFlpIntent = flpResult.flpSandboxFlpIntent;
        flpSandboxMockFlpIntent = flpResult.flpSandboxMockFlpIntent;
        hasRootIntent.flpSandboxRootIntent = flpResult.hasRootIntent.flpSandboxRootIntent;
        hasRootIntent.flpSandboxMockRootIntent = flpResult.hasRootIntent.flpSandboxMockRootIntent;
        if (flpResult.targetMockHtmlFile) {
            projectInfo.targetMockHtmlFile = flpResult.targetMockHtmlFile;
        }

        // Process neo-app configuration and determine OData version
        const neoAppResult = await processNeoAppAndODataVersion(
            projectRoot,
            projectInfo.destination, // Use projectInfo.destination, not the local 'destination' variable
            sapClient,
            mainServiceDatasource,
            feVersion,
            getDestinationFromNeoApp,
            getClientFromDestinationName
        );
        destination = neoAppResult.destination;
        firstNeoAppDestination = neoAppResult.firstNeoAppDestination;
        neoAppUI5Version = neoAppResult.neoAppUI5Version;
        neoappDestinations = neoAppResult.neoappDestinations;
        sapClient = neoAppResult.sapClient;
        const odataVersion = neoAppResult.odataVersion;

        const sapux = packageJson?.sapux === true || (packageJson?.sapux?.length ?? 0) > 0;
        const hasUI5ToolingDep = hasUI5Tooling(packageJson);

        // Determine default FLP intents based on floor plan
        const intentDefaults = determineDefaultFlpIntents(
            floorPlan,
            isSAPApp,
            flpSandboxFlpIntent,
            flpSandboxMockFlpIntent
        );
        flpSandboxFlpIntent = intentDefaults.flpSandboxFlpIntent;
        flpSandboxMockFlpIntent = intentDefaults.flpSandboxMockFlpIntent;

        ui5Version = neoAppUI5Version || checkManifestUI5Version(manifestUI5Version);

        // Update object with latest params
        projectInfo = {
            ...defaultProjectInfo,
            ...{
                moduleName: projectName || packageJson?.name,
                moduleDescription: packageJson?.description || '',
                sapux: sapux,
                isFioriToolsProject: sapux || hasUI5ToolingDep,
                rootPath: projectRoot,
                mainServiceURI:
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    mainServiceDatasource?.uri ? mainServiceDatasource.uri : '',
                mainServiceFsPath: mainServiceDatasource?.settings?.localUri ?? 'localservice/metadata.xml',
                // Get service version from non FE applications
                odataVersion,
                mainEntity: getMainEntity(manifest),
                ui5Theme: 'sap_fiori_3',
                FEVersion: feVersion,
                type: MigrationTypes.project,
                sapLibs: generateSapLibsStr(manifestLibs || {}, flpSandboxLibs),
                mainService,
                floorPlan,
                namespace: namespace,
                scp: scp ?? false,
                destination,
                appTitle,
                appVersion,
                sapClient,
                backends,
                isSAPApp,
                hostname,
                ui5Version,
                manifestUI5Version,
                neoAppUI5Version,
                flpSandboxFlpIntent,
                flpSandboxMockFlpIntent,
                neoappDestinations,
                firstNeoAppDestination,
                hasRootIntent,
                reuseLibs: Object.keys(reuseManifestLibs || {}).join(',')
            }
        };
    } catch (error) {
        messages.push({ type: 'ERROR', description: (error as Error).toString() });
        defaultProjectInfo.rootPath = projectRoot;
        projectInfo = {
            ...defaultProjectInfo
        };
    }

    return { projectInfo, messages };
}
