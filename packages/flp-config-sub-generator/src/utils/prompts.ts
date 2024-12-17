import { basename } from 'path';
import { t } from './i18n';

/**
 * Returns the details for the YUI step.
 *
 * @param appRootPath - path to the application to be displayed in YUI step description
 * @returns step details
 */
export function getYuiNavStep(appRootPath: string): { name: string; description: string }[] {
    return [
        {
            name: t('prompts.flpConfig.name'),
            description: t('prompts.flpConfig.description', {
                appFolderName: basename(appRootPath)
            })
        }
    ];
}
