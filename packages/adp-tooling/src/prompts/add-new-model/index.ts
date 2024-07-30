import type {
    ListQuestion,
    InputQuestion,
    YUIQuestion,
    EditorQuestion,
    ConfirmQuestion
} from '@sap-ux/inquirer-common';
import type { UI5FlexLayer } from '@sap-ux/project-access';

import { t } from '../../i18n';
import { getChangesByType } from '../../base/change-utils';
import {
    ChangeType,
    UserStatePrefix,
    type NewModelAnswers,
    type ManifestChangeProperties,
    UserState
} from '../../types';
import { isCFEnvironment } from '../../base/cf';
import {
    validateEmptyString,
    validateEmptySpaces,
    validateSpecialChars,
    hasContentDuplication,
    hasCustomerPrefix,
    validateJSON
} from '@sap-ux/project-input-validator';

const oDataVersions = [
    { name: '2.0', value: '2.0' },
    { name: '4.0', value: '4.0' }
];

/**
 * Exucute generic validation for input.
 *
 * @param value The value to validate.
 * @param isCustomerBase Whether the validation is for customer usage.
 * @returns {string | boolean} An error message if the value is an empty string, or true if it is not.
 */
function validatePromptInput(value: string, isCustomerBase: boolean): boolean | string {
    const validators = [validateEmptyString, validateEmptySpaces, validateSpecialChars];

    for (const validator of validators) {
        const validationResult = validator(value);
        if (typeof validationResult === 'string') {
            return validationResult;
        }
    }

    if (isCustomerBase && !hasCustomerPrefix(value)) {
        return t('validators.errorInputInvalidValuePrefix', {
            value: t('prompts.oDataServiceNameLabel'),
            prefix: UserStatePrefix.customer
        });
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
 * Validates a string to check if it can be interpreted as valid JSON.
 *
 * @param {string} value - The string to validate.
 * @returns {string | boolean} - Returns true if the string is valid JSON. If invalid, returns an error message.
 */
function validatePromptEmptySpaces(value: string): boolean | string {
    const validationResult = validateEmptyString(value);
    if (typeof validationResult === 'string') {
        return validationResult;
    }

    return validateEmptySpaces(value);
}

/**
 * Validates the OData name prompts.
 *
 * @param value The value to validate.
 * @param answers The answers object.
 * @param isCustomerBase Whether the validation is for customer usage.
 * @param changeFiles The list of existing change files to check against.
 * @returns {boolean | string} True if no duplication is found, or an error message if validation fails.
 */
function validatePromptODataName(
    value: string,
    answers: NewModelAnswers,
    isCustomerBase: boolean,
    changeFiles: ManifestChangeProperties[]
): boolean | string {
    const validationResult = validatePromptInput(value, isCustomerBase);
    if (typeof validationResult === 'string') {
        return validationResult;
    }

    if (hasContentDuplication(value, 'dataSource', changeFiles)) {
        return t('validators.errorDuplicatedValueOData');
    }

    if (value === answers.name) {
        return t('validators.errorDuplicateNamesOData');
    }

    return true;
}

/**
 * Validates the model name prompts.
 *
 * @param value The value to validate.
 * @param isCustomerBase Whether the validation is for customer usage.
 * @param changeFiles The list of existing change files to check against.
 * @returns {boolean | string} True if no duplication is found, or an error message if validation fails.
 */
function validatePromptModelName(
    value: string,
    isCustomerBase: boolean,
    changeFiles: ManifestChangeProperties[]
): boolean | string {
    const validationResult = validatePromptInput(value, isCustomerBase);
    if (typeof validationResult === 'string') {
        return validationResult;
    }

    if (hasContentDuplication(value, 'model', changeFiles)) {
        return t('validators.errorDuplicatedValueSapui5Model');
    }

    return true;
}

/**
 * Gets the prompts for adding the new model.
 *
 * @param {string} projectPath - The root path of the project.
 * @param {UI5FlexLayer} layer - UI5 Flex layer.
 * @returns {YUIQuestion<NewModelAnswers>[]} The questions/prompts.
 */
export function getPrompts(projectPath: string, layer: UI5FlexLayer): YUIQuestion<NewModelAnswers>[] {
    const isCustomerBase = UserState.customer === layer;
    const defaultSeviceName = isCustomerBase ? UserStatePrefix.customer : UserStatePrefix.vendor;
    const isCFEnv = isCFEnvironment(projectPath);

    const changeFiles = getChangesByType(projectPath, ChangeType.ADD_NEW_MODEL, 'manifest');

    return [
        {
            type: 'input',
            name: 'name',
            message: t('prompts.oDataServiceNameLabel'),
            default: defaultSeviceName,
            store: false,
            validate: (value: string, answers: NewModelAnswers) => {
                return validatePromptODataName(value, answers, isCustomerBase, changeFiles);
            },
            guiOptions: {
                mandatory: true,
                hint: t('prompts.oDataServiceNameTooltip')
            }
        } as InputQuestion<NewModelAnswers>,
        {
            type: 'input',
            name: 'uri',
            message: t('prompts.oDataServiceUriLabel'),
            guiOptions: {
                mandatory: true,
                hint: t('prompts.oDataServiceUriTooltip')
            },
            validate: validatePromptEmptySpaces,
            store: false
        } as InputQuestion<NewModelAnswers>,
        {
            type: 'list',
            name: 'version',
            message: t('prompts.oDataServiceVersionLabel'),
            choices: oDataVersions,
            default: (answers: NewModelAnswers) => {
                if (answers.uri?.startsWith(isCFEnv ? 'odata/v4/' : '/sap/opu/odata4/')) {
                    return oDataVersions[1].value;
                }

                return oDataVersions[0].value;
            },
            store: false,
            validate: validateEmptyString,
            guiOptions: {
                mandatory: true,
                hint: t('prompts.oDataServiceVersionTooltip'),
                applyDefaultWhenDirty: true
            }
        } as ListQuestion<NewModelAnswers>,
        {
            type: 'input',
            name: 'modelName',
            message: t('prompts.oDataServiceModelNameLabel'),
            guiOptions: {
                mandatory: true,
                hint: t('prompts.oDataServiceModelNameTooltip')
            },
            default: defaultSeviceName,
            validate: (value: string) => {
                return validatePromptModelName(value, isCustomerBase, changeFiles);
            },
            store: false
        } as InputQuestion<NewModelAnswers>,
        {
            type: 'editor',
            name: 'modelSettings',
            message: t('prompts.oDataServiceModelSettingsLabel'),
            store: false,
            validate: validatePromptJSON,
            guiOptions: {
                hint: t('prompts.oDataServiceModelSettingsTooltip')
            }
        } as EditorQuestion<NewModelAnswers>,
        {
            type: 'confirm',
            name: 'addAnnotationMode',
            message: 'Do you want to add annotation?',
            default: false
        } as ConfirmQuestion<NewModelAnswers>,
        {
            type: 'input',
            name: 'dataSourceName',
            message: t('prompts.oDataAnnotationDataSourceNameLabel'),
            validate: (value: string, answers: NewModelAnswers) => {
                return validatePromptODataName(value, answers, isCustomerBase, changeFiles);
            },
            default: defaultSeviceName,
            store: false,
            guiOptions: {
                mandatory: true,
                hint: t('prompts.oDataAnnotationDataSourceNameTooltip')
            },
            when: (answers: NewModelAnswers) => answers.addAnnotationMode
        } as InputQuestion<NewModelAnswers>,
        {
            type: 'input',
            name: 'dataSourceURI',
            message: t('prompts.oDataAnnotationDataSourceUriLabel'),
            validate: validatePromptEmptySpaces,
            store: false,
            guiOptions: {
                mandatory: true,
                hint: t('prompts.oDataAnnotationDataSourceUriTooltip')
            },
            when: (answers: NewModelAnswers) => answers.addAnnotationMode
        } as InputQuestion<NewModelAnswers>,
        {
            type: 'editor',
            name: 'annotationSettings',
            message: t('prompts.oDataAnnotationSettingsLabel'),
            validate: validatePromptJSON,
            store: false,
            guiOptions: {
                mandatory: false,
                hint: t('prompts.oDataAnnotationSettingsTooltip')
            },
            when: (answers: NewModelAnswers) => answers.addAnnotationMode
        } as EditorQuestion<NewModelAnswers>
    ];
}
