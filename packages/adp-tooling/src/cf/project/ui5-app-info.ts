import fs from 'node:fs';
import path from 'node:path';

import type { ToolsLogger } from '@sap-ux/logger';

import type { CfUi5AppInfo } from '../../types';

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
