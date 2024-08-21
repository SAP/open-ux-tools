import type {
    ConfirmQuestion,
    EditorQuestion,
    ListQuestion,
    InputQuestion,
    YUIQuestion
} from '@sap-ux/inquirer-common';
import type { UI5FlexLayer } from '@sap-ux/project-access';
import {
    FlexLayer,
    ChangeType,
    NamespacePrefix,
    type AddComponentUsageAnswers,
    type ManifestChangeProperties
} from '../../types';
import { getChangesByType } from '../../base/change-utils';
import { t } from '../../i18n';
import {
    validateEmptyString,
    validateEmptySpaces,
    validateSpecialChars,
    hasContentDuplication,
    hasCustomerPrefix,
    validateJSON
} from '@sap-ux/project-input-validator';

/**
 * Exucute generic validation for input.
 *
 * @param value The value to validate.
 * @returns {string | boolean} An error message if the value is an empty string, or true if it is not.
 */
function validatePromptInput(value: string): boolean | string {
    const validators = [validateEmptyString, validateEmptySpaces, validateSpecialChars];

    for (const validator of validators) {
        const validationResult = validator(value);
        if (typeof validationResult === 'string') {
            return validationResult;
        }
    }

    return true;
}

/**
 * Validates the input for the component usage ID.
 *
 * @param value The value to validate.
 * @param changeFiles The change files to check for duplication.
 * @param isCustomerBase Flag to check if the project is customer scenario.
 * @returns {string | boolean} An error message if the value is invalid, or true if it is not.
 */
function validatePromptId(
    value: string,
    changeFiles: ManifestChangeProperties[],
    isCustomerBase: boolean
): boolean | string {
    const validationResult = validatePromptInput(value);
    if (typeof validationResult === 'string') {
        return validationResult;
    }

    if (isCustomerBase) {
        if (!hasCustomerPrefix(value)) {
            return t('validators.errorInputInvalidValuePrefix', {
                value: t('prompts.component.usageIdLabel'),
                prefix: NamespacePrefix.CUSTOMER
            });
        }

        if (!value.replace('customer.', '').length) {
            return t('validators.errorCustomerEmptyValue', {
                value: t('prompts.component.usageIdLabel'),
                prefix: NamespacePrefix.CUSTOMER
            });
        }
    }

    if (hasContentDuplication(value, 'componentUsages', changeFiles)) {
        return t('validators.errorDuplicateValueComponentId');
    }

    return true;
}

/**
 * Validates the input for the library reference.
 *
 * @param value The value to validate.
 * @param changeFiles The change files to check for duplication.
 * @returns {string | boolean} An error message if the value is invalid, or true if it is not.
 */
function validatePromptLibrary(value: string, changeFiles: ManifestChangeProperties[]): boolean | string {
    const validationResult = validatePromptInput(value);
    if (typeof validationResult === 'string') {
        return validationResult;
    }

    if (hasContentDuplication(value, 'libraries', changeFiles)) {
        return t('validators.errorDuplicateValueLibrary');
    }

    return true;
}

/**
 * Validates a JSON string.
 *
 * @param value The JSON string to validate.
 * @returns {boolean | string} True if the JSON is valid, or an error message if validation fails.
 */
function validatePromptJSON(value: string): boolean | string {
    const validationResult = validateEmptyString(value);
    if (typeof validationResult === 'string') {
        return true;
    }

    return validateJSON(value);
}

/**
 * Gets the prompts for adding a component usage.
 *
 * @param {string} basePath - The base path of the project.
 * @param {UI5FlexLayer} layer - The layer of the project.
 * @returns {YUIQuestion<AddComponentUsageAnswers>[]} The questions/prompts.
 */
export function getPrompts(basePath: string, layer: UI5FlexLayer): YUIQuestion<AddComponentUsageAnswers>[] {
    const componentUsageChangeFiles = getChangesByType(basePath, ChangeType.ADD_COMPONENT_USAGES, 'manifest');
    const libraryChangeFiles = getChangesByType(basePath, ChangeType.ADD_LIBRARY_REFERENCE, 'manifest');
    const isCustomerBase = layer === FlexLayer.CUSTOMER_BASE;

    const isLazyDropDownOptions = [
        { name: t('choices.true'), value: 'true' },
        { name: t('choices.false'), value: 'false' }
    ];
    return [
        {
            type: 'input',
            name: `usageId`,
            message: t('prompts.component.usageIdLabel'),
            validate: (value: string) => validatePromptId(value, componentUsageChangeFiles, isCustomerBase),
            default: isCustomerBase ? NamespacePrefix.CUSTOMER : NamespacePrefix.EMPTY,
            store: false,
            guiOptions: {
                mandatory: true,
                hint: t('prompts.component.usageIdTooltip')
            }
        } as InputQuestion<AddComponentUsageAnswers>,
        {
            type: 'input',
            name: 'name',
            message: t('prompts.component.nameLabel'),
            validate: validatePromptInput,
            store: false,
            guiOptions: {
                mandatory: true,
                hint: t('prompts.component.nameTooltip')
            }
        } as InputQuestion<AddComponentUsageAnswers>,
        {
            type: 'list',
            name: 'isLazy',
            message: t('prompts.component.isLazyLabel'),
            choices: isLazyDropDownOptions,
            default: isLazyDropDownOptions[1].value,
            store: false,
            guiOptions: {
                mandatory: true,
                hint: t('prompts.component.isLazyTooltip')
            }
        } as ListQuestion<AddComponentUsageAnswers>,
        {
            type: 'editor',
            name: `settings`,
            message: t('prompts.component.settingsLabel'),
            validate: validatePromptJSON,
            store: false,
            guiOptions: {
                hint: t('prompts.component.tooltip', { input: t('prompts.component.settingsLabel') })
            }
        } as EditorQuestion<AddComponentUsageAnswers>,
        {
            type: 'editor',
            name: `data`,
            message: t('prompts.component.dataLabel'),
            validate: validatePromptJSON,
            store: false,
            guiOptions: {
                hint: t('prompts.component.tooltip', { input: t('prompts.component.dataLabel') })
            }
        } as EditorQuestion<AddComponentUsageAnswers>,
        {
            type: 'confirm',
            name: 'shouldAddLibrary',
            message: t('prompts.component.shouldAddLibraryLabel'),
            default: false,
            guiOptions: {
                hint: t('prompts.component.shouldAddLibraryTooltip')
            }
        } as ConfirmQuestion<AddComponentUsageAnswers>,
        {
            type: 'input',
            name: 'library',
            message: t('prompts.component.libraryLabel'),
            guiOptions: {
                mandatory: true,
                hint: t('prompts.component.libraryTooltip')
            },
            validate: (value: string) => validatePromptLibrary(value, libraryChangeFiles),
            store: false,
            when: (answers: AddComponentUsageAnswers) => answers.shouldAddLibrary
        } as InputQuestion<AddComponentUsageAnswers>,
        {
            type: 'list',
            name: `libraryIsLazy`,
            message: t('prompts.component.libraryIsLazyLabel'),
            choices: isLazyDropDownOptions,
            default: isLazyDropDownOptions[1].value,
            store: false,
            guiOptions: {
                mandatory: true,
                hint: t('prompts.component.libraryIsLazyTooltip')
            },
            when: (answers: AddComponentUsageAnswers) => answers.shouldAddLibrary
        } as ListQuestion<AddComponentUsageAnswers>
    ];
}
