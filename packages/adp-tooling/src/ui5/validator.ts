import { validateEmptyString } from '@sap-ux/project-input-validator';
import axios from 'axios';
import { getProxyAgentConfig } from '@sap-ux/axios-extension';
import { t } from '../i18n.js';
import { getOfficialBaseUI5VersionUrl, getFormattedVersion } from './format.js';
import { isOfflineError } from './network.js';

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
        const url = `${selectedVersionURL}/${resource}`;
        await axios.get(url, getProxyAgentConfig(url));
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
