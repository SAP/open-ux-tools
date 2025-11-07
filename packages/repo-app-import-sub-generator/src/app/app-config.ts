import { TemplateType, type FioriElementsApp, type LROPSettings } from '@sap-ux/fiori-elements-writer';
import { OdataVersion } from '@sap-ux/odata-service-inquirer';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import type { Editor } from 'mem-fs-editor';
import { TransportChecksService } from '@sap-ux/axios-extension';
import { t } from '../utils/i18n';
import type { AppInfo, QfaJsonConfig } from '../app/types';
import { readManifest } from '../utils/file-helpers';
import { fioriAppSourcetemplateId } from '../utils/constants';
import { PromptState } from '../prompts/prompt-state';
import type { AbapDeployConfig } from '@sap-ux/ui5-config';
import RepoAppDownloadLogger from '../utils/logger';
import { FileName } from '@sap-ux/project-access';
import { join } from 'node:path';
import { getUI5Versions, type UI5Version } from '@sap-ux/ui5-info';
import { type OdataServiceAnswers } from '@sap-ux/odata-service-inquirer';

/**
 * Shared context for downloading and deploying ABAP applications.
 */
export interface AppDownloadContext {
    serviceProvider?: AbapServiceProvider;
    qfaJson: QfaJsonConfig;
}

/**
 * Resolve a transport request for the given app/package context.
 * This function performs defensive checks and logs clear, actionable messages.
 *
 * @param context - AppDownloadContext containing qfaJson and serviceProvider
 * @returns { Promise<string> } - Resolved transport request string
 *  - '' when package is local ('$TMP')
 *  - '<transport-request-id>' when transport request is found
 *  - 'REPLACE_WITH_TRANSPORT' when no transport request is found
 * @throws Error when the transport check fails
 */
async function resolveTransportRequest(context: AppDownloadContext): Promise<string> {
    const { serviceProvider, qfaJson } = context;

    const transportService = await serviceProvider?.getAdtService<TransportChecksService>(TransportChecksService);
    const packageName = qfaJson.metadata.package;
    const appName = qfaJson.deploymentDetails.repositoryName;

    if (packageName === '$TMP') {
        return '';
    }

    try {
        const transportRequests = await transportService?.getTransportRequests(packageName, appName);
        if (transportRequests && transportRequests.length === 1) {
            return transportRequests[0].transportNumber;
        }
        return 'REPLACE_WITH_TRANSPORT';
    } catch (error) {
        if (error.message === TransportChecksService.LocalPackageError) {
            return '';
        }
        const msg = t('error.transportCheckFailed', { error: error?.message });
        RepoAppDownloadLogger.logger?.error(msg);
        throw new Error(msg);
    }
}

/**
 * Generates the deployment configuration for an ABAP application.
 *
 * @param {AppDownloadContext} context - The download context with service provider and qfa info.
 * @returns {AbapDeployConfig} The deployment configuration containing `target` and `app` info.
 */
export const getAbapDeployConfig = async (context: AppDownloadContext): Promise<AbapDeployConfig> => {
    const { qfaJson } = context;

    const transportRequest = await resolveTransportRequest(context);
    return {
        target: {
            url: PromptState.baseURL,
            client: PromptState.sapClient,
            destination: PromptState.destinationName as string
        },
        app: {
            name: qfaJson.deploymentDetails.repositoryName,
            package: qfaJson.metadata.package,
            description: qfaJson.deploymentDetails.repositoryDescription,
            transport: transportRequest
        }
    } as AbapDeployConfig; // NOSONAR
};

/**
 * Fetches the metadata of a given service from the provided ABAP service provider.
 *
 * @param {AbapServiceProvider} provider - The ABAP service provider instance.
 * @param {string} serviceUrl - The URL of the service to retrieve metadata for.
 * @returns {Promise<any>} - A promise resolving to the service metadata.
 */
const fetchServiceMetadata = async (provider: AbapServiceProvider, serviceUrl: string): Promise<string | undefined> => {
    try {
        const metadata = await provider.service(serviceUrl).metadata();
        RepoAppDownloadLogger.logger?.debug('Metadata fetched successfully');
        return metadata as string | undefined;
    } catch (err) {
        RepoAppDownloadLogger.logger?.error(t('error.metadataFetchError', { error: err.message }));
    }
};

/**
 * Gets the application configuration based on the provided user answers and manifest data.
 * This configuration will be used to initialize a new Fiori application.
 *
 * @param {AppInfo} app - Selected app information.
 * @param {string} extractedProjectPath - Path where the app files are extracted.
 * @param {AppDownloadContext} context - The download context with service provider and qfa info.
 * @param {OdataServiceAnswers} systemSelection - User's selection of the OData service and system.
 * @param {Editor} fs - The file system editor to manipulate project files.
 * @returns {Promise<FioriElementsApp<LROPSettings>>} - A promise resolving to the generated app configuration.
 * @throws {Error} - Throws an error if there are issues generating the configuration.
 */
export async function getAppConfig(
    app: AppInfo,
    extractedProjectPath: string,
    context: AppDownloadContext,
    systemSelection: OdataServiceAnswers,
    fs: Editor
): Promise<FioriElementsApp<LROPSettings>> {
    try {
        const manifest = readManifest(join(extractedProjectPath, FileName.Manifest), fs);
        const serviceProvider = PromptState.systemSelection?.connectedSystem?.serviceProvider as AbapServiceProvider;
        context.serviceProvider = serviceProvider;
        if (!manifest?.['sap.app']?.dataSources) {
            RepoAppDownloadLogger.logger?.error(t('error.dataSourcesNotFound'));
        }

        const odataVersion =
            manifest?.['sap.app']?.dataSources?.mainService?.settings?.odataVersion === '4.0'
                ? OdataVersion.v4
                : OdataVersion.v2;

        // Fetch metadata for the service
        const metadata = await fetchServiceMetadata(
            serviceProvider,
            manifest?.['sap.app']?.dataSources?.mainService.uri ?? ''
        );

        // Fetch latest UI5 versions from npm
        const ui5Versions: UI5Version[] = await getUI5Versions({ onlyNpmVersion: true });
        const localVersion = ui5Versions[0]?.version;

        const appConfig: FioriElementsApp<LROPSettings> = {
            app: {
                id: app.appId,
                title: app.title,
                description: app.description,
                sourceTemplate: {
                    id: fioriAppSourcetemplateId
                },
                projectType: 'EDMXBackend',
                flpAppId: `${app.appId.replace(/[-_.#]/g, '')}-tile`
            },
            package: {
                name: app.appId,
                description: app.description,
                devDependencies: {},
                scripts: {},
                version: manifest?.['sap.app']?.applicationVersion?.version ?? '0.0.1'
            },
            template: {
                type: TemplateType.ListReportObjectPage,
                settings: {
                    entityConfig: {
                        mainEntityName: context.qfaJson.serviceBindingDetails.mainEntityName
                    }
                }
            },
            service: {
                path: manifest?.['sap.app']?.dataSources?.mainService.uri,
                version: odataVersion,
                metadata: metadata,
                url: PromptState.baseURL,
                client: PromptState.sapClient
            },
            appOptions: {
                addAnnotations: odataVersion === OdataVersion.v4,
                addTests: true,
                useVirtualPreviewEndpoints: true
            },
            ui5: {
                localVersion
            }
        };
        if (PromptState.destinationName) {
            appConfig.service.destination = { name: PromptState.destinationName };
        }
        return appConfig;
    } catch (error) {
        RepoAppDownloadLogger.logger?.error(t('error.appConfigGenError', { error: error.message }));
        throw error;
    }
}
