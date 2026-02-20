import { basename } from 'node:path';
import { type FLPConfigPromptOptions, promptNames } from '@sap-ux/flp-config-inquirer';
/**
 * Returns the details for the YUI prompt.
 *
 * @param appRootPath - path to the application to be displayed in YUI step description
 * @returns step details
 */
export function getYUIDetails(appRootPath: string): { name: string; description: string }[] {
    return [
        {
            name: 'Fiori Launchpad Configuration',
            description: `Configure Fiori Launchpad settings - ${basename(appRootPath)}`
        }
    ];
}

/**
 * Adds the provided prompt options to the default FLP config prompt options.
 *
 * @param promptOptions - FLP configuration prompt options
 * @returns - FLP configuration prompt options with defaults applied
 */
export function getPromptOptions(promptOptions?: FLPConfigPromptOptions): FLPConfigPromptOptions {
    return {
        ...promptOptions,
        [promptNames.inboundId]: { hide: true, ...promptOptions?.inboundId },
        [promptNames.existingFlpConfigInfo]: { hide: true, ...promptOptions?.existingFlpConfigInfo },
        [promptNames.icon]: { hide: true, ...promptOptions?.icon },
        [promptNames.additionalParameters]: { hide: true, ...promptOptions?.additionalParameters },
        [promptNames.confirmReplace]: { hide: true, ...promptOptions?.confirmReplace }
    };
}
