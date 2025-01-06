import { basename } from 'path';

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
