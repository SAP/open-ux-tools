import { OdataVersion } from '@sap-ux/odata-service-inquirer';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import type { Editor } from 'mem-fs-editor';
import type { AppDownloadContext, AppInfo } from '../app/types.js';
import { PromptState } from '../prompts/prompt-state.js';
import type { AbapDeployConfig } from '@sap-ux/ui5-config';
import RepoAppDownloadLogger from '../utils/logger.js';
import { t } from '../utils/i18n.js';
import { FileName } from '@sap-ux/project-access';
import { resolveTransportRequest } from '../utils/download-utils.js';
import { AuthenticationType } from '@sap-ux/store';
import { readManifest } from '../utils/file-helpers.js';
import { join } from 'node:path';

/**
 * Derived app configuration for the ABAP repository download flow.
 * Built from the downloaded manifest and used as the single source of truth
 * for README generation, launch config, and deploy config.
 */
export interface AbapRepoAppConfig {
    app: {
        id: string;
        title: string;
        flpAppId: string;
    };
    service: {
        url: string | undefined;
        version: OdataVersion;
    };
    ui5: {
        version: string;
    };
}

/**
 * Builds the app configuration for the ABAP repository download flow by reading
 * the downloaded manifest. Returns a typed config object used as the single source
 * of truth for README generation, launch config, and deploy config.
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
    const odataVersion = manifest?.['sap.app']?.dataSources?.mainService?.settings?.odataVersion?.startsWith('4')
        ? OdataVersion.v4
        : OdataVersion.v2;
    return {
        app: {
            id: appId,
            title: appTitle,
            flpAppId: `${appId.replace(/[-_.#]/g, '')}-tile`
        },
        service: {
            url: PromptState.baseURL,
            version: odataVersion
        },
        ui5: {
            version: ui5Version
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
export async function getAbapRepoDeployConfig(app: AppInfo, context: AppDownloadContext): Promise<AbapDeployConfig> {
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
