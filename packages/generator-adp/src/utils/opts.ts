import type { AppWizard } from '@sap-devx/yeoman-ui-types';

import type { ToolsLogger } from '@sap-ux/logger';

import { getPackageInfo } from './deps';

export interface GeneratorOpts {
    appWizard?: AppWizard;
    vscode?: any;
    data?: {
        path: string;
    };
}

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
