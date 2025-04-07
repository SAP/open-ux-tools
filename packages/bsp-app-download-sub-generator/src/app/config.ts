import { TemplateType, type FioriElementsApp, type LROPSettings } from '@sap-ux/fiori-elements-writer';
import { OdataVersion } from '@sap-ux/odata-service-inquirer';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import type { Editor } from 'mem-fs-editor';
import { t } from '../utils/i18n';
import type { AppInfo, AppContentConfig, EntityConfig } from '../app/types';
import { readManifest } from '../utils/file-helpers';
import { getLatestUI5Version } from '@sap-ux/ui5-info';
import { getMinimumUI5Version } from '@sap-ux/project-access';
import { adtSourceTemplateId } from '../utils/constants';
import { PromptState } from '../prompts/prompt-state';
import { join } from 'path';
import { validateAppContentJsonFile } from '../utils/validate-app-content-json';
import type { AbapDeployConfig } from '@sap-ux/ui5-config';
import BspAppDownloadLogger from '../utils/logger';

/**
 * Generates the deployment configuration for an ABAP application.
 *
 * @param {AppInfo} app - Application info containing `url` and `repoName`.
 * @param {AppContentCofig} appContentJson - Application content JSON with deployment details.
 * @returns {AbapDeployConfig} The deployment configuration containing `target` and `app` info.
 */
export const getAbapDeployConfig = (app: AppInfo, appContentJson: AppContentConfig): AbapDeployConfig => {
    return {
        // todo: get from json file
        target: {
            url: app.url,
            destination: app.repoName
        },
        app: {
            name: appContentJson.deploymentDetails.repositoryName,
            package: appContentJson.metadata.package,
            description: appContentJson.deploymentDetails?.repositoryDescription,
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
const fetchServiceMetadata = async (provider: AbapServiceProvider, serviceUrl: string): Promise<any> => {
    try {
        return await provider.service(serviceUrl).metadata();
    } catch (err) {
        BspAppDownloadLogger.logger?.error(t('error.metadatafetchError', { error: err.message }));
    }
};

/**
 * Generates the entity configuration based on the provided application content JSON.
 *
 * @param {any} appContentJson - The application content JSON containing service binding details.
 * @returns {EntityConfig} - The generated entity configuration.
 */
function getEntityConfig(appContentJson: AppContentConfig): EntityConfig {
    // Extract main entity name
    const mainEntityName = appContentJson.serviceBindingDetails.mainEntityName;
    // Initialize entity configuration with main entity name
    const entityConfig: EntityConfig = {
        mainEntityName: mainEntityName
    };

    // If navigationEntity exists, add it to the entityConfig
    if (appContentJson.serviceBindingDetails.navigationEntity) {
        entityConfig['navigationEntity'] = {
            EntitySet: appContentJson.serviceBindingDetails.navigationEntity.EntitySet,
            Name: appContentJson.serviceBindingDetails.navigationEntity.Name
        };
    }
    return entityConfig;
}

/**
 * Gets the application configuration based on the provided user answers and manifest data.
 * This configuration will be used to initialize a new Fiori application.
 *
 * @param {AppInfo} app - Selected app information.
 * @param {string} extractedProjectPath - Path where the app files are extracted.
 * @param appContentJson
 * @param {Editor} fs - The file system editor to manipulate project files.
 * @param {Logger} [log] - An optional logger instance for error logging.
 * @returns {Promise<FioriElementsApp<LROPSettings>>} - A promise resolving to the generated app configuration.
 * @throws {Error} - Throws an error if there are issues generating the configuration.
 */
export async function getAppConfig(
    app: AppInfo,
    extractedProjectPath: string,
    appContentJson: AppContentConfig,
    fs: Editor
): Promise<FioriElementsApp<LROPSettings>> {
    try {
        validateAppContentJsonFile(appContentJson);
        const manifest = readManifest(extractedProjectPath, fs);

        const serviceProvider = PromptState.systemSelection?.connectedSystem?.serviceProvider as AbapServiceProvider;

        if (!manifest?.['sap.app']?.dataSources) {
            throw Error(t('error.dataSourcesNotFound'));
        }

        const odataVersion =
            manifest?.['sap.app']?.dataSources?.mainService?.settings?.odataVersion === '4.0'
                ? OdataVersion.v4
                : OdataVersion.v2;

        // Fetch metadata for the service
        const metadata = await fetchServiceMetadata(
            serviceProvider,
            manifest?.['sap.app']?.dataSources?.mainService.uri
        );

        const appConfig: FioriElementsApp<LROPSettings> = {
            app: {
                id: app.appId,
                title: app.title,
                description: app.description,
                sourceTemplate: {
                    id: adtSourceTemplateId
                },
                projectType: 'EDMXBackend',
                flpAppId: `${app.appId.replace(/[-_.]/g, '')}-tile` // todo: check if flpAppId is correct
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
                    entityConfig: getEntityConfig(appContentJson)
                }
            },
            service: {
                path: manifest?.['sap.app']?.dataSources?.mainService.uri,
                version: odataVersion,
                metadata,
                url: serviceProvider.defaults.baseURL
            },
            appOptions: {
                addAnnotations: odataVersion === OdataVersion.v4,
                addTests: true
            },
            ui5: {
                version:
                    appContentJson.projectAttribute?.minimumUi5Version ??
                    getMinimumUI5Version(manifest) ??
                    (await getLatestUI5Version())
            }
        };
        return appConfig;
    } catch (error) {
        BspAppDownloadLogger.logger?.error(t('error.appConfigGenError', { error: error.message }));
        throw error;
    }
}
