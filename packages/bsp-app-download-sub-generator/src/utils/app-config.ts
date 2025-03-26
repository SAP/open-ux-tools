import { TemplateType, type FioriElementsApp, type LROPSettings } from '@sap-ux/fiori-elements-writer';
import { type Manifest } from '@sap-ux/project-access';
import { OdataVersion } from '@sap-ux/odata-service-inquirer';
import type { AbapServiceProvider, ServiceDocument } from '@sap-ux/axios-extension';
import type { Logger } from '@sap-ux/logger';
import type { Editor } from 'mem-fs-editor';
import { t } from '../utils/i18n';
import type { BspAppDownloadAnswers } from '../app/types';
import { readManifest } from './utils';
import { getLatestUI5Version } from '@sap-ux/ui5-info';
import { getMinimumUI5Version } from '@sap-ux/project-access';
import { adtSourceTemplateId } from './constants';
import { PromptState } from '../prompts/prompt-state';

/**
 * Retrieves metadata for the provided service URL.
 *
 * @param {AbapServiceProvider} provider - The ABAP service provider.
 * @param {string} serviceUrl - The URL of the service to fetch metadata for.
 * @param {Logger} [log] - The logger instance.
 * @returns {Promise<any>} - The retrieved metadata.
 */
const fetchMetadata = async (provider: AbapServiceProvider, serviceUrl: string, log?: Logger): Promise<any> => {
    try {
        return await provider.service(serviceUrl).metadata();
    } catch (err) {
        log?.error(`Error fetching metadata: ${err.message}`);
        throw err;
    }
};

// /**
//  * Retrieves the main entity name from the manifest routing targets.
//  *
//  * @param {string} entity - The entity to check for in the manifest.
//  * @param {Manifest} manifest - The manifest.json object.
//  * @returns {string} - The valid main entity name if found, otherwise throws an error.
//  * @throws {Error} - If the routing configuration is invalid or the entity is not found.
//  */
// const getMainEntityName = (entity: string, manifest: Manifest): string => {
//     const entityList = `${entity}List`;
//     const targetConfig = manifest['sap.ui5']?.routing?.targets?.[entityList]?.options as
//         | Record<string, any>
//         | undefined;

//     if (!targetConfig) {
//         throw new Error(`Could not find entity name: "${entityList}" in manifest.json!`);
//     }
//     const { settings } = targetConfig;
//     if (!settings) {
//         throw new Error(`Invalid or missing 'settings' in navigation source: "${entityList}"`);
//     }
//     // Extract the contextPath and entitySet from the settings
//     const contextPath = settings.contextPath;
//     const entitySet = settings.entitySet;
//     // Validate the extracted paths
//     if (contextPath && contextPath === `/${entity}`) {
//         return entity;
//     } else if (entitySet && entitySet === entity) {
//         return entity;
//     }
//     throw new Error(
//         `Invalid routing configuration for navigation source: "${entityList}". Neither contextPath nor entitySet matches the entity: "${entity}".`
//     );
// };

const getEntity = async (provider: AbapServiceProvider, manifest: Manifest): Promise<string> => {
    const entities: ServiceDocument = await provider
        .service(manifest?.['sap.app']?.dataSources?.mainService.uri ?? '')
        .document();
    if (!entities.EntitySets || entities.EntitySets.length === 0) {
        throw Error(t('error.entitySetsNotFound'));
    }
    return entities.EntitySets[0];
};

/**
 * Generates the application configuration based on the manifest.json file.
 *
 * @param {any} answers - The user inputs containing appId.
 * @param extractedProjectPath
 * @param {Editor} fs - The file system editor.
 * @param {Logger} [log] - The logger instance.
 * @returns {FioriElementsApp<LROPSettings>} - The generated application configuration.
 */
export async function getAppConfig(
    answers: BspAppDownloadAnswers,
    extractedProjectPath: string,
    fs: Editor,
    log?: Logger
): Promise<FioriElementsApp<LROPSettings>> {
    try {
        const { selectedApp } = answers;
        const manifest = await readManifest(extractedProjectPath, fs);
        const serviceProvider = PromptState.systemSelection?.connectedSystem?.serviceProvider as AbapServiceProvider;
        if (!manifest?.['sap.app']?.dataSources) {
            throw Error(t('error.dataSourcesNotFound'));
        }

        const odataVersion =
            manifest?.['sap.app']?.dataSources?.mainService?.settings?.odataVersion === '4.0'
                ? OdataVersion.v4
                : OdataVersion.v2;
        const metadata = await fetchMetadata(serviceProvider, manifest?.['sap.app']?.dataSources?.mainService.uri, log);
        const entity = await getEntity(serviceProvider, manifest);
        //const mainEntityName = getMainEntityName(entity, manifest);
        const routes = (manifest?.['sap.ui5']?.routing?.routes ?? []) as Array<{
            pattern: string;
            name: string;
            target: string;
        }>;
        const mainEntityName = routes.find((route) => route.pattern === ':?query:')?.name;

        const appConfig: FioriElementsApp<LROPSettings> = {
            app: {
                id: selectedApp.appId,
                title: selectedApp.title,
                description: selectedApp.description,
                sourceTemplate: {
                    id: adtSourceTemplateId,
                    version: manifest?.['sap.app']?.sourceTemplate?.version,
                    toolsId: manifest?.['sap.app']?.sourceTemplate?.toolsId
                },
                projectType: 'EDMXBackend',
                flpAppId: `${selectedApp.appId.replace(/[-_.]/g, '')}-tile` // todo: check if flpAppId is correct
            },
            package: {
                name: selectedApp.appId,
                description: selectedApp.description,
                devDependencies: {},
                sapuxLayer: 'VENDOR', // todo: add internal feature enabled check,
                scripts: {},
                version: manifest?.['sap.app']?.applicationVersion?.version ?? '0.0.1'
            },
            template: {
                type: TemplateType.ListReportObjectPage,
                settings: {
                    entityConfig: {
                        mainEntityName: mainEntityName ?? entity ?? '' // todo: add check for v2 service
                    }
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
                version: getMinimumUI5Version(manifest) ?? (await getLatestUI5Version())
            }
        };
        return appConfig;
    } catch (error) {
        log?.error(`Error generating application configuration: ${error.message}`);
        throw error;
    }
}
