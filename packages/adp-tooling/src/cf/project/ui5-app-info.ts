import fs from 'node:fs';
import path from 'node:path';

import type { ToolsLogger } from '@sap-ux/logger';
import { readUi5Yaml } from '@sap-ux/project-access';

import type { CfConfig, CfUi5AppInfo } from '../../types';
import { t } from '../../i18n';
import { getBaseAppId } from '../../base/helper';
import { getCfUi5AppInfo, getOrCreateServiceInstanceKeys } from '../services/api';
import { getAppHostIds } from '../app/discovery';

/**
 * Fetches ui5AppInfo.json content and writes it to the project root.
 *
 * @param basePath - path to application root
 * @param ui5AppInfo - ui5AppInfo.json content
 * @param logger - logger instance
 */
export async function writeUi5AppInfo(basePath: string, ui5AppInfo: CfUi5AppInfo, logger?: ToolsLogger): Promise<void> {
    try {
        const ui5AppInfoTargetPath = path.join(basePath, 'ui5AppInfo.json');
        fs.writeFileSync(ui5AppInfoTargetPath, JSON.stringify(ui5AppInfo, null, 2), 'utf-8');
        logger?.info(`Written ui5AppInfo.json to ${basePath}`);
    } catch (error) {
        logger?.error(`Failed to process ui5AppInfo.json: ${(error as Error).message}`);
        throw error;
    }
}

/**
 * Extracts reusable library paths from ui5AppInfo.json if it exists.
 *
 * @param basePath - path to application root
 * @param logger - logger instance
 * @returns Array of path configurations for reusable libraries
 */
export function getReusableLibraryPaths(
    basePath: string,
    logger?: ToolsLogger
): Array<{ path: string; src: string; fallthrough: boolean }> {
    const ui5AppInfoPath = path.join(basePath, 'ui5AppInfo.json');
    if (!fs.existsSync(ui5AppInfoPath)) {
        logger?.warn('ui5AppInfo.json not found in project root');
        return [];
    }

    const ui5AppInfoData = JSON.parse(fs.readFileSync(ui5AppInfoPath, 'utf-8')) as Record<string, unknown>;
    const ui5AppInfo = ui5AppInfoData[Object.keys(ui5AppInfoData)[0]] as CfUi5AppInfo;

    const reusableLibs =
        ui5AppInfo.asyncHints?.libs?.filter(
            (lib) => lib.html5AppName && lib.url && typeof lib.url === 'object' && lib.url.url !== undefined
        ) ?? [];

    return reusableLibs.map((lib) => {
        const libName = String(lib.name);
        const html5AppName = String(lib.html5AppName);
        const resourcePath = '/resources/' + libName.replaceAll('.', '/');

        return {
            path: resourcePath,
            src: `./.adp/reuse/${html5AppName}`,
            fallthrough: true
        };
    });
}

/**
 * Downloads ui5AppInfo.json from the FDC service and writes it to the project root.
 * Reads the html5-apps-repo service instance name from the app-variant-bundler-build
 * task in ui5.yaml, fetches service keys, then calls the FDC API.
 *
 * @param projectPath - path to application root
 * @param cfConfig - CF configuration (token, url, space)
 * @param logger - optional logger instance
 */
export async function downloadUi5AppInfo(projectPath: string, cfConfig: CfConfig, logger?: ToolsLogger): Promise<void> {
    const ui5Config = await readUi5Yaml(projectPath, 'ui5.yaml');
    const bundlerTask = ui5Config.findCustomTask<{ serviceInstanceName?: string; space?: string }>(
        'app-variant-bundler-build'
    );
    const serviceInstanceName = bundlerTask?.configuration?.serviceInstanceName;
    if (!serviceInstanceName) {
        throw new Error(t('error.noServiceInstanceNameFound'));
    }

    const spaceGuid = bundlerTask?.configuration?.space;
    const serviceInfo = await getOrCreateServiceInstanceKeys(
        { names: [serviceInstanceName], ...(spaceGuid ? { spaceGuids: [spaceGuid] } : {}) },
        logger
    );
    if (!serviceInfo || serviceInfo.serviceKeys.length === 0) {
        throw new Error(`No service keys found for service instance: ${serviceInstanceName}`);
    }

    const appId = await getBaseAppId(projectPath);
    const appHostIds = getAppHostIds(serviceInfo.serviceKeys);
    if (appHostIds.length === 0) {
        throw new Error('No app host IDs found in service keys.');
    }

    const ui5AppInfo = await getCfUi5AppInfo(appId, appHostIds, cfConfig, logger);
    await writeUi5AppInfo(projectPath, ui5AppInfo, logger);
}
