import { t } from '../i18n';
import type { ManifestNamespace } from '@sap-ux/project-access';

/**
 * Validates the URI input.
 *
 * @param {string} value - The value to validate.
 * @param {string} input - The input name.
 * @param {boolean} isMandatory - Whether the input is mandatory.
 * @returns {boolean | string} - The validation result.
 */
export function validateURI(value: string, input: string, isMandatory = true): boolean | string {
    if (value.length === 0) {
        return isMandatory ? t('validators.inputCannotBeEmpty', { input }) : true;
    }

    if (value.indexOf(' ') >= 0) {
        return t('validators.inpuCannotHaveSpaces', { input });
    }

    return true;
}

/**
 * Validates the OData service input.
 *
 * @param {string} value - The value to validate.
 * @param {ManifestNamespace.DataSource[]} oDataSources - The OData sources from the manifest.
 * @returns {boolean | string} - The validation result.
 */
export function validateODataServices(value: string, oDataSources: ManifestNamespace.DataSource[]): boolean | string {
    if (!value) {
        return t('validators.inputCannotBeEmpty', { input: 'OData Service' });
    }
    if (oDataSources.length === 0) {
        return t('validators.manifestContainsNoODataServices');
    }

    return true;
}
