import { existsSync } from 'fs';
import { join } from 'path';
import { FileName, Severity } from '../types';
import { findAllPackageJsonFolders, getUi5CustomMiddleware } from './project-utils';
import type { ResultMessage } from '../types';
import { t } from '../i18n';

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
    const appRoots = await findAllPackageJsonFolders(wsFolders);

    messages.push({
        severity: Severity.Info,
        text: t('info.foundNumApps', { numApps: appRoots.length })
    });

    for (const appRoot of appRoots) {
        try {
            const appDestinations = await getDestinationFromApp(appRoot);

            if (appDestinations.length > 0) {
                destinations.push(...appDestinations);
                messages.push({
                    severity: Severity.Info,
                    text: t('info.foundDestinationsInApp', { appRoot, appDestinations: appDestinations.join(', ') })
                });
            } else {
                messages.push({
                    severity: Severity.Debug,
                    text: t('info.noDestinationsFoundInApp', { appRoot })
                });
            }
        } catch (error) {
            messages.push({
                severity: Severity.Debug,
                text: t('info.noDestinationDefinedForApp', { appRoot, error: error.message })
            });
        }
    }

    return {
        messages,
        destinations
    };
}
