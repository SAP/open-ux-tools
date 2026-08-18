import { OdataVersion } from '@sap-ux/odata-service-inquirer';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import type { Editor } from 'mem-fs-editor';
import type { AppInfo, AbapRepositoryContext, AbapRepoAppConfig } from '../app/types.js';
import { PromptState } from '../prompts/prompt-state.js';
import type { AbapDeployConfig } from '@sap-ux/ui5-config';
import RepoAppDownloadLogger from '../utils/logger.js';
import { t } from '../utils/i18n.js';
import { getFlpId } from '@sap-ux/fiori-generator-shared';
import { FileName, DirName, getMainService } from '@sap-ux/project-access';
import { resolveTransportRequest, fetchServiceMetadata } from '../utils/download-utils.js';
import { AuthenticationType } from '@sap-ux/store';
import { readManifest, getTemplateTypeFromManifest } from '../utils/file-helpers.js';
import { join } from 'node:path';

/**
 * Fetches OData metadata for the main service and writes it to local service folder in the webapp.
 *
 * @param {AbapServiceProvider} provider - The connected ABAP service provider.
 * @param {string} webappPath - Absolute path to the webapp folder.
 * @param {Editor} fs - The mem-fs editor.
 */
export async function writeServiceMetadata(
    provider: AbapServiceProvider,
    webappPath: string,
    fs: Editor
): Promise<void> {
    const manifest = readManifest(join(webappPath, FileName.Manifest), fs);
    const serviceName = getMainService(manifest);
    const serviceUri = serviceName ? manifest?.['sap.app']?.dataSources?.[serviceName]?.uri : undefined;

    if (!serviceName || !serviceUri) {
        RepoAppDownloadLogger.logger?.debug('No main service URI found in manifest; skipping metadata fetch.');
        return;
    }

    const metadata = await fetchServiceMetadata(provider, serviceUri);
    if (metadata) {
        fs.write(join(webappPath, DirName.LocalService, serviceName, 'metadata.xml'), metadata);
    }
}

/**
 * Builds the app configuration for the ABAP repository download flow by reading
 * the downloaded manifest. Returns a typed config object used for README generation, launch config, and deploy config.
 *
 * @param {string} webappPath - Path to the webapp folder.
 * @param {AppInfo} appInfo - The selected app info from prompts.
 * @param {Editor} fs - The file system editor.
 * @returns {AbapRepoAppConfig} Derived app configuration.
 */
export function getAbapRepoAppConfig(webappPath: string, appInfo: AppInfo, fs: Editor): AbapRepoAppConfig {
    const manifest = readManifest(join(webappPath, FileName.Manifest), fs);
    const appId = manifest?.['sap.app']?.id ?? appInfo.appId;
    const appTitle = manifest?.['sap.app']?.title ?? appInfo.title ?? '';
    const minUI5Version = manifest?.['sap.ui5']?.dependencies?.minUI5Version ?? '';
    const ui5Version = Array.isArray(minUI5Version) ? (minUI5Version[0] ?? '') : minUI5Version;
    const mainServiceName = getMainService(manifest);
    const odataVersionStr = mainServiceName
        ? manifest?.['sap.app']?.dataSources?.[mainServiceName]?.settings?.odataVersion
        : undefined;
    const odataVersion = odataVersionStr === '4.0' ? OdataVersion.v4 : OdataVersion.v2;
    const templateType = getTemplateTypeFromManifest(manifest);
    return {
        app: {
            id: appId,
            title: appTitle,
            flpAppId: `${getFlpId(appId)}-tile`
        },
        service: {
            url: PromptState.baseURL,
            version: odataVersion
        },
        ui5: {
            version: ui5Version
        },
        template: {
            type: templateType
        }
    };
}

/**
 * Generates the deployment configuration for an ABAP repository application.
 * Fetches package and description from the UI5 ABAP Repository service.
 *
 * @param {AppInfo} app - The application information collected from user prompts.
 * @param {AppDownloadContext} context - The download context.
 * @returns {Promise<AbapDeployConfig>} The deployment configuration.
 */
export async function getAbapRepoDeployConfig(app: AppInfo, context: AbapRepositoryContext): Promise<AbapDeployConfig> {
    const { serviceProvider } = context;
    let packageName = '';
    let description = '';

    try {
        // get package and description from repository
        const repoInfo = await (serviceProvider as AbapServiceProvider)
            ?.getUi5AbapRepository()
            .getInfo(app?.repoName ?? '');
        packageName = repoInfo?.Package ?? '';
        description = repoInfo?.Description ?? '';
    } catch (error) {
        RepoAppDownloadLogger.logger?.warn(
            t('warn.repoInfoFetchFailed', { repoName: app?.repoName, error: error?.message })
        );
    }

    const transport = await resolveTransportRequest(serviceProvider, packageName, app?.repoName ?? '');
    return {
        target: {
            url: PromptState.baseURL,
            client: PromptState.sapClient,
            destination: PromptState.destinationName as string,
            ...(PromptState.authenticationType === AuthenticationType.ReentranceTicket && {
                authenticationType: PromptState.authenticationType
            })
        },
        app: {
            name: app?.repoName,
            package: packageName,
            description: description || app?.description,
            transport
        }
    } as AbapDeployConfig; // NOSONAR
}
