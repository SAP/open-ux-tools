import { validateEmptyString } from '@sap-ux/project-input-validator';

import { t } from '../i18n';
import { getOfficialBaseUI5VersionUrl, getFormattedVersion } from './format';
import { isOfflineError } from './network';

/**
 * Validates a specified UI5 version by checking its availability on the SAP CDN.
 *
 * @param {string} [version] - The version to validate.
 * @returns {Promise<string | boolean>} True if the version is valid, a string message if not, or if an error occurs.
 */
export async function validateUI5VersionExists(version: string): Promise<string | boolean> {
    const validationResult = validateEmptyString(version);
    if (typeof validationResult === 'string') {
        return validationResult;
    }

    const selectedVersionURL = getOfficialBaseUI5VersionUrl(version);
    const resource = version.includes('snapshot') ? 'neo-app.json' : getFormattedVersion(version);

    try {
        await fetch(`${selectedVersionURL}/${resource}`);
        return true;
    } catch (e) {
        if (version.includes('snapshot')) {
            const message = t('validators.ui5VersionNotReachableError');
            return `${message.replace('<URL>', selectedVersionURL)}`;
        }
        if (e.response?.status === 400 || e.response?.status === 404) {
            return t('validators.ui5VersionOutdatedError');
        }
        if (isOfflineError(e)) {
            return true;
        }
        return t('validators.ui5VersionDoesNotExistGeneric', { error: e.message });
    }
}
