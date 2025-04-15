import { TemplateType, type FioriElementsApp, type LROPSettings } from '@sap-ux/fiori-elements-writer';
import { OdataVersion } from '@sap-ux/odata-service-inquirer';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import type { Editor } from 'mem-fs-editor';
import { t } from '../utils/i18n';
import type { AppInfo, QfaJsonConfig } from '../app/types';
import { readManifest } from '../utils/file-helpers';
import { fioriAppSourcetemplateId } from '../utils/constants';
import { PromptState } from '../prompts/prompt-state';
import type { AbapDeployConfig } from '@sap-ux/ui5-config';
import RepoAppDownloadLogger from '../utils/logger';
import { FileName } from '@sap-ux/project-access';
import { join } from 'path';

/**
 * Generates the deployment configuration for an ABAP application.
 *
 * @param {AppInfo} app - Application info containing `url` and `repoName`.
 * @param {QfaJsonConfig} qfaJson - The QFA JSON configuration containing app details.
 * @returns {AbapDeployConfig} The deployment configuration containing `target` and `app` info.
 */
export const getAbapDeployConfig = (app: AppInfo, qfaJson: QfaJsonConfig): AbapDeployConfig => {
    return {
        target: {
            url: PromptState.baseURL,
            client: PromptState.sapClient,
            destination: app.repoName
        },
        app: {
            name: qfaJson.deploymentDetails.repositoryName,
            package: qfaJson.metadata.package,
            description: qfaJson.deploymentDetails.repositoryDescription,
            transport: 'REPLACE_WITH_TRANSPORT'
        }
    };
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
        return await provider.service(serviceUrl).metadata();
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
 * @param {QfaJsonConfig} qfaJson - The QFA JSON configuration containing app details.
 * @param {Editor} fs - The file system editor to manipulate project files.
 * @returns {Promise<FioriElementsApp<LROPSettings>>} - A promise resolving to the generated app configuration.
 * @throws {Error} - Throws an error if there are issues generating the configuration.
 */
export async function getAppConfig(
    app: AppInfo,
    extractedProjectPath: string,
    qfaJson: QfaJsonConfig,
    fs: Editor
): Promise<FioriElementsApp<LROPSettings>> {
    try {
        const manifest = readManifest(join(extractedProjectPath, FileName.Manifest), fs);
        const serviceProvider = PromptState.systemSelection?.connectedSystem?.serviceProvider as AbapServiceProvider;
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
                        mainEntityName: qfaJson.serviceBindingDetails.mainEntityName
                    }
                }
            },
            service: {
                path: manifest?.['sap.app']?.dataSources?.mainService.uri,
                version: odataVersion,
                metadata: metadata,
                url: serviceProvider.defaults.baseURL
            },
            appOptions: {
                addAnnotations: odataVersion === OdataVersion.v4,
                addTests: true
            }
        };
        return appConfig;
    } catch (error) {
        RepoAppDownloadLogger.logger?.error(t('error.appConfigGenError', { error: error.message }));
        throw error;
    }
}
