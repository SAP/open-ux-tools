import { TemplateType, type FioriElementsApp, type LROPSettings } from '@sap-ux/fiori-elements-writer';
import { OdataVersion } from '@sap-ux/odata-service-inquirer';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import type { Editor } from 'mem-fs-editor';
import { t } from '../utils/i18n.js';
import type { AppInfo, AppDownloadContext } from '../app/types.js';
import { readManifest } from '../utils/file-helpers.js';
import { fioriAppSourcetemplateId, adtSourceTemplateId } from '../utils/constants.js';
import { PromptState } from '../prompts/prompt-state.js';
import type { AbapDeployConfig } from '@sap-ux/ui5-config';
import RepoAppDownloadLogger from '../utils/logger.js';
import { FileName } from '@sap-ux/project-access';
import { join } from 'node:path';
import { getUI5Versions, type UI5Version } from '@sap-ux/ui5-info';
import { type OdataServiceAnswers } from '@sap-ux/odata-service-inquirer';
import { resolveTransportRequest } from '../utils/download-utils.js';

/**
 * Fetches the metadata of a given service from the provided ABAP service provider.
 *
 * @param {AbapServiceProvider} provider - The ABAP service provider instance.
 * @param {string} serviceUrl - The URL of the service to retrieve metadata for.
 * @returns {Promise<string | undefined>} - A promise resolving to the service metadata.
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
 * @param {AppInfo} app - The application information collected from user prompts.
 * @param {string} extractedProjectPath - Path where the app files are extracted.
 * @param {AppDownloadContext} context - The download context with service provider and qfa info.
 * @param {OdataServiceAnswers} systemSelection - The system selection answers.
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

        if (manifest?.['sap.app']?.sourceTemplate?.id !== adtSourceTemplateId) {
            RepoAppDownloadLogger.logger?.error(t('error.readManifestErrors.sourceTemplateNotSupported'));
        }
        if (!manifest?.['sap.app']?.dataSources) {
            RepoAppDownloadLogger.logger?.error(t('error.dataSourcesNotFound'));
        }

        const odataVersion = manifest?.['sap.app']?.dataSources?.mainService?.settings?.odataVersion?.startsWith('4')
            ? OdataVersion.v4
            : OdataVersion.v2;

        const metadata = await fetchServiceMetadata(
            serviceProvider,
            manifest?.['sap.app']?.dataSources?.mainService.uri ?? ''
        );

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
                        mainEntityName: context.qfaJson?.serviceBindingDetails.mainEntityName ?? ''
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

/**
 * Generates the deployment configuration for an ADT Quick Deploy application.
 *
 * @param {AppDownloadContext} context - The download context.
 * @returns {Promise<AbapDeployConfig>} The deployment configuration.
 */
export async function getAdtDeployConfig(context: AppDownloadContext): Promise<AbapDeployConfig> {
    const { qfaJson, serviceProvider } = context;
    if (!qfaJson) {
        throw new Error(t('error.qfaJsonNotFound', { jsonFileName: 'qfa.json' }));
    }
    const packageName = qfaJson.metadata.package;
    const transport = await resolveTransportRequest(
        serviceProvider,
        packageName,
        qfaJson.deploymentDetails.repositoryName
    );
    return {
        target: {
            url: PromptState.baseURL,
            client: PromptState.sapClient,
            destination: PromptState.destinationName as string
        },
        app: {
            name: qfaJson.deploymentDetails.repositoryName,
            package: packageName,
            description: qfaJson.deploymentDetails.repositoryDescription,
            transport
        }
    } as AbapDeployConfig; // NOSONAR
}
