import { convert } from '@sap-ux/annotation-converter';
import type { Annotations, ServiceProvider } from '@sap-ux/axios-extension';
import { isAbapEnvironmentOnBtp, isAppStudio } from '@sap-ux/btp-utils';
import type { CapRuntime, CapService } from '@sap-ux/cap-config-writer';
import { checkCdsUi5PluginEnabled, getAppLaunchText } from '@sap-ux/cap-config-writer';
import { parse } from '@sap-ux/edmx-parser';
import type { TemplateType as FETemplateType } from '@sap-ux/fiori-elements-writer';
import { TemplateTypeAttributes } from '@sap-ux/fiori-elements-writer';
import { writeApplicationInfoSettings } from '@sap-ux/fiori-tools-settings';
import type { DebugOptions, FioriOptions } from '@sap-ux/launch-config';
import { createLaunchConfig } from '@sap-ux/launch-config';
import type { Logger } from '@sap-ux/logger';
import {
    DatasourceType,
    OdataVersion,
    type ConnectedSystem,
    type EntityRelatedAnswers
} from '@sap-ux/odata-service-inquirer';
import type { CdsAnnotationsInfo, EdmxAnnotationsInfo } from '@sap-ux/odata-service-writer';
import type { CapProjectType, CdsUi5PluginInfo, CdsVersionInfo } from '@sap-ux/project-access';
import { isCapJavaProject, toReferenceUri } from '@sap-ux/project-access';
import type { Editor } from 'mem-fs-editor';
import { basename, join } from 'node:path';
import { v4 as uuidV4 } from 'uuid';
import type { GenerateLaunchConfigOptions, Service } from '../types';
import { ApiHubType, SapSystemSourceType, FloorplanFE, minUi5VersionForPageBuildingBlock } from '../types';
import { minSupportedUi5Version, minSupportedUi5VersionV4 } from '../types/constants';
import { type Floorplan, FloorplanAttributes, FloorplanFF } from '../types/external';
import { t } from './i18n';
import { getBackendSystemType } from '@sap-ux/store';

/**
 * Parse the specified edmx string for validitiy and return the ODataVersion of the specified edmx string.
 *
 * @param edmx
 * @returns ODataVersion, odata version
 * @throws Error, if invalid edmx
 */
export function getODataVersion(edmx: string): OdataVersion {
    try {
        const convertedMetadata = convert(parse(edmx));
        return convertedMetadata.version.startsWith('4') ? OdataVersion.v4 : OdataVersion.v2;
    } catch (error) {
        throw Error(t('error.appConfigUnparseableEdmx'));
    }
}

/**
 * Get AppId from provided namespace and name.
 *
 * @param name
 * @param namespace
 * @returns AppId
 */
export function getAppId(name: string, namespace?: string): string {
    const fullyQualifiedProjectName = [namespace, name].filter((x) => !!x).join('.');
    return fullyQualifiedProjectName.replace(/[_-]/g, '');
}

/**
 * Builds the sap-client parameter for the URL.
 * If sapClient is not provided, returns an empty string.
 *
 * @param sapClient
 * @returns sap-client parameter
 */
export function buildSapClientParam(sapClient: string): string {
    return sapClient ? `sap-client=${sapClient}` : '';
}

/**
 * If a floorplan only supports single odata version, get that version.
 * Otherwise returns undefined, indicating multiple versions are supported.
 *
 * @param floorplan a floorplan value
 * @returns - array of supported odata versions or undefined if all are supported
 */
export function getRequiredOdataVersion(floorplan: Floorplan): OdataVersion | undefined {
    const supportedVers = FloorplanAttributes[floorplan].supportedODataVersion;
    return supportedVers.length === 1 ? supportedVers[0] : undefined;
}

/**
 * Gets the minimum supported UI5 version for the specified OData version, floorplan, and entity configuration.
 * For FPM floorplans with page building blocks, enforces a minimum version of 1.136.0.
 *
 * @param version - The OData version.
 * @param floorplan - The floorplan type.
 * @param entityRelatedConfig - entity related configuration.
 * @returns The minimum supported UI5 version as a string.
 */
export function getMinSupportedUI5Version(
    version: OdataVersion,
    floorplan: Floorplan,
    entityRelatedConfig?: Partial<EntityRelatedAnswers>
): string {
    if (floorplan === FloorplanFE.FE_FPM && entityRelatedConfig?.addPageBuildingBlock) {
        return minUi5VersionForPageBuildingBlock;
    }

    let minUI5Version: string | undefined;
    if (floorplan && floorplan !== FloorplanFF.FF_SIMPLE) {
        const templateType = FloorplanAttributes[floorplan].templateType as FETemplateType;
        minUI5Version = TemplateTypeAttributes[templateType].minimumUi5Version[version];
    }
    return minUI5Version ?? (version === OdataVersion.v4 ? minSupportedUi5VersionV4 : minSupportedUi5Version);
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
 * Retrieves information related to cds version and checks if the CAP UI5 plugin is enabled.
 *
 * @param capProjectPath The path to the CAP project.
 * @param fs The file system editor.
 * @param cdsVersionInfo If provided will be used instead of parsing the package.json file to determine the cds version.
 * @returns A promise that resolves to an object containing cdsinformation,
 *          or `undefined` if the CAP UI5 plugin is not enabled.
 */
export async function getCdsUi5PluginInfo(
    capProjectPath: string,
    fs: Editor,
    cdsVersionInfo?: CdsVersionInfo
): Promise<CdsUi5PluginInfo | undefined> {
    // If the project is a Java project, do not pass cdsVersionInfo.
    // This ensures that hasMinCdsVersion is false for Java project, preventing certain prompts (e.g typescript, virtual endpoints) from being invoked for Java projects.
    const cdsVersion = (await isCapJavaProject(capProjectPath)) ? undefined : cdsVersionInfo;
    const capCdsInfo = await checkCdsUi5PluginEnabled(capProjectPath, fs, true, cdsVersion);
    return capCdsInfo === false ? undefined : (capCdsInfo as CdsUi5PluginInfo);
}

/**
 * Returns CDS annotations information.
 *
 * @param {CapService} capService - The CAP service object containing information about the service.
 * @param {string} projectName - The name of the project, which is the module name.
 * @returns {Promise<CdsAnnotationsInfo>} A promise that resolves to an object containing CDS annotations information.
 */
export async function getCdsAnnotations(
    capService: CapService,
    projectName: string
): Promise<CdsAnnotationsInfo | undefined> {
    const { appPath: capAppPath = 'app', projectPath, serviceCdsPath, serviceName } = capService;
    if (serviceCdsPath) {
        // Construct the annotation path and service cds URI
        const annotationPath = join(capAppPath, projectName, 'annotation.cds').replace(/\\/g, '/');
        const serviceCdsUri = await toReferenceUri(projectPath, annotationPath, serviceCdsPath);
        // Create the contents of the annotation CDS file
        const annotationCdsContents = `using ${serviceName} as service from '${serviceCdsUri}';`;
        // Return an object with the necessary information for cds files
        return {
            cdsFileContents: annotationCdsContents,
            projectPath: projectPath,
            appPath: capAppPath,
            projectName: projectName
        };
    }
}

/**
 * Determine if the specified connected system is ABAP cloud.
 *
 * @param connectedSystem - The connected system object.
 * @returns {boolean} `true` if the connected system is ABAP cloud, otherwise `false`.
 */
export function isAbapCloud(connectedSystem?: ConnectedSystem): boolean {
    if (connectedSystem?.backendSystem) {
        return getBackendSystemType(connectedSystem.backendSystem) === 'AbapCloud';
    }
    return connectedSystem?.destination ? isAbapEnvironmentOnBtp(connectedSystem.destination) : false;
}

/**
 * Retrieves the data source label.
 *
 * @param {DatasourceType} source - The data source type (`DatasourceType.sapSystem` or `DatasourceType.businessHub`).
 * @param abapCloud - Indicates if the SAP system is an ABAP Cloud system (BTP or S4HC).
 * @param {ApiHubType} apiHubType - The API hub type for business hubs.
 * @returns {string} The formatted data source label.
 */
export function getReadMeDataSourceLabel(source: DatasourceType, abapCloud = false, apiHubType?: ApiHubType): string {
    let dataSourceLabel: string | undefined;
    if (source === DatasourceType.sapSystem) {
        const labelDatasourceType = t(`readme.label.datasourceType.${DatasourceType.sapSystem}`);
        const labelSystemType = t(
            `readme.label.sapSystemType.${abapCloud ? SapSystemSourceType.ABAP_CLOUD : SapSystemSourceType.ON_PREM}`
        );
        dataSourceLabel = `${labelDatasourceType} (${labelSystemType})`;
    } else if (source === DatasourceType.businessHub && apiHubType === ApiHubType.apiHubEnterprise) {
        dataSourceLabel = t('readme.label.datasourceType.apiBusinessHubEnterprise');
    }
    return dataSourceLabel ?? t(`readme.label.datasourceType.${source}`);
}

/**
 * Generates the launch text for the application based on the CAP service information and project details.
 *
 * @param {CapServiceCdsInfo} capService - The CAP (Cloud Application Programming) service information.
 * @param {string} name - The name of the project.
 * @param {boolean} useNpmWorkspaceAppRef - For CAP projects, indicates whether (root CAP project) npm workspaces app ref should be used when launching.
 * @param {string} namespace - The namespace of the project.
 * @returns {string} The launch text for the application. If CAP service information is provided, it returns a custom launch text based on the CAP service type,
 *  project name, and optionally the application ID if NPM workspaces or CDS UI5 plugin is enabled.
 *  If CAP service information is not available, it returns a default launch text.
 */
export async function getLaunchText(
    capService: Service['capService'],
    name: string,
    useNpmWorkspaceAppRef: boolean,
    namespace?: string
): Promise<string> {
    if (capService) {
        const appId =
            capService?.cdsUi5PluginInfo?.isCdsUi5PluginEnabled || useNpmWorkspaceAppRef // May be a case where isCdsUi5PluginEnabled is false but we know it will be enabled by the time the app is launched
                ? getAppId(name, namespace)
                : undefined;
        return getAppLaunchText(capService.capType ?? 'Node.js', name, appId);
    }
    return t('readme.texts.runInstruction');
}

/**
 * Generates the launch configuration for a project based on the provided options.
 *
 * @param {GenerateLaunchConfigOptions} options - An object containing configuration options for the project.
 * @param {OdataVersion} options.odataVersion - The version of the OData service (e.g. v2 or v4) used by the project.
 * @param {DatasourceType} options.source - The type of data source the project uses (e.g. metadata file or OData source URL).
 * @param {string} options.sapClientParam - The SAP client parameter.
 * @param {string} options.targetFolder - The file path to the project where the launch configuration should be created.
 * @param {string} options.projectName - The name of the project.
 * @param {string} options.appId - The application ID for the project.
 * @param {Editor} fs - The file system editor.
 * @param {any} vscode - The Visual Studio Code object.
 * @param {Logger} [log] - An optional logger instance.
 * @param {boolean} [writeToAppOnly] - A flag indicating whether to write the configuration only to the app folder.
 * @returns {void}
 */
export async function generateLaunchConfig(
    options: GenerateLaunchConfigOptions,
    fs: Editor,
    vscode?: any,
    log?: Logger,
    writeToAppOnly: boolean = false
): Promise<void> {
    try {
        if (vscode) {
            const addStartCmd = options.datasourceType !== DatasourceType.metadataFile;
            const projectPath = join(options.targetFolder, options.projectName);
            const debugOptions: DebugOptions = {
                vscode: vscode,
                addStartCmd,
                sapClientParam: options.sapClientParam,
                flpAppId: options?.enableVirtualEndpoints ? 'app-preview' : options.flpAppId ?? '',
                flpSandboxAvailable: !options?.enableVirtualEndpoints,
                isAppStudio: isAppStudio(),
                writeToAppOnly
            };
            if (options.odataVersion) {
                debugOptions.odataVersion = options.odataVersion === OdataVersion.v2 ? '2.0' : '4.0';
            }
            const fioriOptions: FioriOptions = {
                name: basename(options.projectName),
                projectRoot: projectPath,
                startFile: options?.enableVirtualEndpoints ? 'test/flp.html' : undefined,
                debugOptions
            };
            await createLaunchConfig(projectPath, fioriOptions, fs, log);
            writeApplicationInfoSettings(projectPath);
        }
    } catch (err) {
        log?.error(`${t('error.errorWritingApplicationFiles')} : ${err}`);
    }
}

/**
 * Convert between the CAPProjectType project type from the `@sap-ux/project-access' package and the CAP Runtime type from the `@sap-ux/odata-service-inquirer' package.
 *
 * @param {CapRuntime} capRuntime - The CAP runtime type. Default is 'Node.js'.
 * @returns {CapProjectType} The CAP project type.
 */
export function convertCapRuntimeToCapProjectType(capRuntime: CapRuntime = 'Node.js'): CapProjectType {
    return capRuntime === 'Java' ? 'CAPJava' : 'CAPNodejs';
}

/**
 * Get the annotations for the project based on the provided CAP service or transforms the annotations to the correct type otherwise.
 *
 * @param {string} projectName - The name of the project for which annotations are being retrieved.
 * @param {Annotations} annotations - The EDMX annotations object containing technical name and XML definitions.
 * @param {CapService} capService - The CAP service instance used to retrieve CDS annotations.
 * @returns {Promise<CdsAnnotationsInfo | EdmxAnnotationsInfo>} A promise that resolves to either CDS annotations info or EDMX annotations info.
 */
export async function getAnnotations(
    projectName: string,
    annotations?: Annotations,
    capService?: CapService
): Promise<CdsAnnotationsInfo | EdmxAnnotationsInfo | undefined> {
    // Add annotations to fiori app
    if (capService) {
        return getCdsAnnotations(capService, projectName);
    }

    if (annotations) {
        return {
            technicalName: annotations.TechnicalName,
            xml: annotations.Definitions
        };
    }
}

/**
 * Restore the loggers for the service provider if they are missing.
 * This is necessary because the service provider may have been serialized and deserialized, which can lead to missing loggers which contain circular refs.
 * Not doing this will result in the loggers being undefined when trying to access them, and calling services will throw.
 *
 * @param logger - The logger instance to be restored.
 * @param serviceProvider - The service provider object that may have missing loggers.
 * @returns The service provider with restored loggers.
 */
export function restoreServiceProviderLoggers(
    logger: Logger,
    serviceProvider?: ServiceProvider
): ServiceProvider | undefined {
    // Restore the loggers if missing.
    for (const service in (serviceProvider as any)?.services) {
        if ((serviceProvider as any).services?.[service].log && !(serviceProvider as any).services[service].log.info) {
            (serviceProvider as any).services[service].log = logger;
        }
    }
    if (serviceProvider?.log && !serviceProvider.log.info) {
        serviceProvider.log = logger;
    }
    return serviceProvider;
}
