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
 * Sets the header title in the AppWizard UI, if the `setHeaderTitle` method is available.
 * This helps users identify the generator and its version in the Yeoman UI interface.
 *
 * @param {GeneratorOpts} opts - The generator options, potentially including the AppWizard instance.
 * @param {ToolsLogger} logger - Logger instance used for logging any errors that occur during execution.
 */
export function setHeaderTitle(opts: GeneratorOpts, logger: ToolsLogger): void {
    try {
        if (typeof opts?.appWizard?.setHeaderTitle === 'function') {
            const { name = '', version = '', displayName = '' } = getPackageInfo();
            if (name && version) {
                opts.appWizard.setHeaderTitle((displayName as string) || name, `${name}@${version}`);
            }
        }
    } catch (e) {
        logger.error(`An error occurred while trying to set '@sap-ux/generator-adp' header: ${e.message}`);
    }
}
