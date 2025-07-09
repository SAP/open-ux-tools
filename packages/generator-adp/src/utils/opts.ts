import type { IChildLogger } from '@vscode-logging/logger';
import type { ToolsLogger } from '@sap-ux/logger';

import { getPackageInfo } from './deps';
import type { AdpGeneratorOptions } from '../app/types';

export interface GeneratorOpts {
    appWizard?: {
        setHeaderTitle?(title: string, tooltip: string): void;
    };
}

/**
 * Sets the header title in the AppWizard UI, if the `setHeaderTitle` method is available.
 * This helps users identify the generator and its version in the Yeoman UI interface.
 *
 * @param {GeneratorOpts} opts - The generator options, potentially including the AppWizard instance.
 * @param {IChildLogger} logger - Logger instance used for logging any errors that occur during execution.
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
