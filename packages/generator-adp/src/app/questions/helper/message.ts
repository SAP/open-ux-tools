import { isAppStudio } from '@sap-ux/btp-utils';

import { t } from '../../../utils/i18n';

/**
 * Creates a message for extension project prompt based on the provided parameters.
 *
 * @param {boolean} isApplicationSupported - Whether the selected application is supported.
 * @param {boolean} hasSyncViews - Whether synchronized views exist for the app.
 * @param {string} [errorMessage] - Optional validation error message (only used in BAS).
 * @returns {string} A message for confirm extension project prompt.
 */
export const getExtProjectMessage = (
    isApplicationSupported: boolean,
    hasSyncViews: boolean,
    errorMessage?: string
): string => {
    if (isAppStudio() && errorMessage) {
        return `${errorMessage} ${t('prompts.extProjectSuggestion')}`;
    }

    return isApplicationSupported && hasSyncViews
        ? t('prompts.createExtProjectWithSyncViewsLabel')
        : t('prompts.createExtProjectLabel');
};
