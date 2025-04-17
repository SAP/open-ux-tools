import { t } from '../../../utils/i18n';
import { resolveNodeModuleGenerator } from '../../extension/generator-resolver';

/**
 * Validates whether the extensibility sub-generator is available and sets it up if necessary.
 * If the generator is not found, an error message is returned advising on the necessary action.
 *
 * @param {boolean} isApplicationSupported - Whether the selected application is supported.
 * @param {boolean} hasSyncViews - Whether synchronized views exist for the app.
 * @returns {boolean | string} Returns true if app is supported and contains sync views, or an error message if not.
 */
export function validateExtensibilityGenerator(
    value: boolean,
    isApplicationSupported: boolean,
    hasSyncViews: boolean
): boolean | string {
    if (value) {
        const generator = resolveNodeModuleGenerator();

        if (!generator) {
            return t('error.extensibilityGenNotFound');
        }

        return true;
    }

    return isApplicationSupported && hasSyncViews ? true : t('prompts.createExtProjectContinueLabel');
}
