import type { CustomMiddleware, FioriToolsProxyConfig } from '@sap-ux/ui5-config';
import type { ResultMessage } from '../types';
import { findAllApps } from '@sap-ux/project-access';
import { existsSync, promises as fsPromises } from 'fs';
import { join } from 'path';
import * as yaml from 'yamljs';
import { FileName, Severity } from '../types';
import { t } from '../i18n';

/**
 * Internal function to return the ui5 middleware settings of a given Fiori elements project (v2 or v4).
 *
 * @param root string - path to the SAP UX project (where the ui5.yaml is)
 * @returns middleware proxy
 */
async function getUi5CustomMiddleware(root: string): Promise<CustomMiddleware<FioriToolsProxyConfig>> {
    const yamlContent = (await fsPromises.readFile(join(root, FileName.Ui5Yaml))).toString();
    const middlewares: CustomMiddleware<FioriToolsProxyConfig>[] = yaml.parse(yamlContent)?.server?.customMiddleware;
    return middlewares?.find((element) => element.name === 'fiori-tools-proxy');
}

/**
 * Retrieve destination from the app.
 *
 * @param appRoot root of app
 * @returns destination
 */
async function getDestinationFromApp(appRoot: string): Promise<string[]> {
    const appDestinations: string[] = [];
    if (existsSync(join(appRoot, FileName.Ui5Yaml))) {
        const middleware = await getUi5CustomMiddleware(appRoot);
        for (const backendConfig of middleware.configuration.backend || []) {
            if (backendConfig.destination) {
                appDestinations.push(backendConfig.destination);
            }
        }
    } else {
        throw Error(t('error.ui5YamlMissing', { appRoot }));
    }
    return appDestinations;
}

/**
 * Retrieve destinations from workspace.
 *
 * @param wsFolders workspace folders
 * @returns messages, destinations
 */
export async function getDestinationsFromWorkspace(
    wsFolders: string[]
): Promise<{ messages: ResultMessage[]; destinations: string[] }> {
    const messages: ResultMessage[] = [];
    const destinations: string[] = [];
    messages.push({
        severity: Severity.Info,
        text: t('info.appSearch', { folders: wsFolders.join(', ') })
    });
    const allApps = await findAllApps(wsFolders);

    messages.push({
        severity: Severity.Info,
        text: t('info.foundNumApps', { numApps: allApps.length })
    });

    for (const app of allApps) {
        try {
            const appDestinations = await getDestinationFromApp(app.appRoot);

            if (appDestinations.length > 0) {
                destinations.push(...appDestinations);
                messages.push({
                    severity: Severity.Info,
                    text: t('info.foundDestinationsInApp', {
                        appRoot: app.appRoot,
                        appDestinations: appDestinations.join(', ')
                    })
                });
            } else {
                messages.push({
                    severity: Severity.Debug,
                    text: t('info.noDestinationsFoundInApp', { appRoot: app.appRoot })
                });
            }
        } catch (error) {
            messages.push({
                severity: Severity.Debug,
                text: t('info.noDestinationDefinedForApp', { appRoot: app.appRoot, error: error.message })
            });
        }
    }

    return {
        messages,
        destinations
    };
}
