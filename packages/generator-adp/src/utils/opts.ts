import type { AppWizard } from '@sap-devx/yeoman-ui-types';
import type { IVSCodeExtLogger, LogLevel } from '@vscode-logging/logger';
import type { BaseOptions } from 'yeoman-generator';

import type { ToolsLogger } from '@sap-ux/logger';
import type { LogWrapper } from '@sap-ux/fiori-generator-shared';

import { getPackageInfo } from './deps.js';

export type GeneratorOpts = BaseOptions & {
    appWizard?: AppWizard;
    vscode?: any;
    data?: {
        path: string;
    };
    logger?: IVSCodeExtLogger;
    logLevel?: LogLevel;
    logWrapper?: LogWrapper;
};

/**
 * Sets a custom header title in the AppWizard UI, if the `setHeaderTitle` method is available.
 * This allows generators to specify their own display name while keeping the version information.
 *
 * @param {GeneratorOpts} opts - The generator options, potentially including the AppWizard instance.
 * @param {ToolsLogger} logger - Logger instance used for logging any errors that occur during execution.
 * @param {string} customTitle - Optional custom title to display instead of the package name.
 */
export function setHeaderTitle(opts: GeneratorOpts, logger: ToolsLogger, customTitle?: string): void {
    try {
        if (typeof opts?.appWizard?.setHeaderTitle === 'function') {
            const { name = '', version = '', displayName = '' } = getPackageInfo();
            if (name && version) {
                const headerTitle = customTitle ?? ((displayName as string) || name);
                opts.appWizard.setHeaderTitle(headerTitle, `${name}@${version}`);
            }
        }
    } catch (e) {
        logger.error(`An error occurred while trying to set '@sap-ux/generator-adp' header: ${e.message}`);
    }
}
