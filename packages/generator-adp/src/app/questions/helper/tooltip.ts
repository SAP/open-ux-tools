import { t } from '../../../utils/i18n';

/**
 * Returns a tooltip message for project name input fields, customized based on the project's user layer.
 *
 * @param {boolean} isCustomerBase - Determines if the tooltip is for a customer base project.
 * @returns {string} A tooltip message with specific validation rules.
 */
export function getProjectNameTooltip(isCustomerBase: boolean): string {
    const baseType = isCustomerBase ? 'Ext' : 'Int';
    const lengthErrorMsg = t(`prompts.projectNameLengthError${baseType}`);
    const validationErrorMsg = t(`prompts.projectNameValidationError${baseType}`);
    return `${lengthErrorMsg} ${validationErrorMsg}`;
}
