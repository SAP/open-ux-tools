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
    NamespacePrefix,
    type NewModelAnswers,
    type ManifestChangeProperties,
    FlexLayer
} from '../../types';
import { isCFEnvironment } from '../../base/cf';
import {
    validateEmptyString,
    validateEmptySpaces,
    validateSpecialChars,
    hasContentDuplication,
    hasCustomerPrefix,
    isDataSourceURI,
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
 * Validates the OData Service name prompt.
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
    const validationResult = validatePromptInput(value);
    if (typeof validationResult === 'string') {
        return validationResult;
    }

    if (isCustomerBase && !hasCustomerPrefix(value)) {
        return t('validators.errorInputInvalidValuePrefix', {
            value: t('prompts.oDataServiceNameLabel'),
            prefix: NamespacePrefix.CUSTOMER
        });
    }

    if (hasContentDuplication(value, 'dataSource', changeFiles)) {
        return t('validators.errorDuplicatedValueOData');
    }

    if (value === answers.dataSourceName) {
        return t('validators.errorDuplicateNamesOData');
    }

    return true;
}

/**
 * Validates the OData Annotation name prompt.
 *
 * @param value The value to validate.
 * @param answers The answers object.
 * @param isCustomerBase Whether the validation is for customer usage.
 * @param changeFiles The list of existing change files to check against.
 * @returns {boolean | string} True if no duplication is found, or an error message if validation fails.
 */
function validatePromptODataAnnotationsName(
    value: string,
    answers: NewModelAnswers,
    isCustomerBase: boolean,
    changeFiles: ManifestChangeProperties[]
): boolean | string {
    const validationResult = validatePromptInput(value);
    if (typeof validationResult === 'string') {
        return validationResult;
    }

    if (isCustomerBase && !hasCustomerPrefix(value)) {
        return t('validators.errorInputInvalidValuePrefix', {
            value: t('prompts.oDataAnnotationDataSourceNameLabel'),
            prefix: NamespacePrefix.CUSTOMER
        });
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
    const validationResult = validatePromptInput(value);
    if (typeof validationResult === 'string') {
        return validationResult;
    }

    if (isCustomerBase && !hasCustomerPrefix(value)) {
        return t('validators.errorInputInvalidValuePrefix', {
            value: t('prompts.oDataServiceModelNameLabel'),
            prefix: NamespacePrefix.CUSTOMER
        });
    }

    if (hasContentDuplication(value, 'model', changeFiles)) {
        return t('validators.errorDuplicatedValueSapui5Model');
    }

    return true;
}

/**
 * Validates the OData Source URI prompt.
 *
 * @param value The value to validate.
 * @returns {boolean | string} True if the URI is valid, or an error message if validation fails.
 */
function validatePromptURI(value: string): boolean | string {
    const validationResult = validateEmptyString(value);
    if (typeof validationResult === 'string') {
        return validationResult;
    }

    if (!isDataSourceURI(value)) {
        return t('validators.errorInvalidDataSourceURI');
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
    const isCustomerBase = FlexLayer.CUSTOMER_BASE === layer;
    const defaultSeviceName = isCustomerBase ? NamespacePrefix.CUSTOMER : NamespacePrefix.EMPTY;
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
            validate: validatePromptURI,
            store: false
        } as InputQuestion<NewModelAnswers>,
        {
            type: 'list',
            name: 'version',
            message: t('prompts.oDataServiceVersionLabel'),
            choices: oDataVersions,
            default: (answers: NewModelAnswers) => {
                if (answers.uri?.startsWith(isCFEnv ? '/odata/v4/' : '/sap/opu/odata4/')) {
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
                return validatePromptODataAnnotationsName(value, answers, isCustomerBase, changeFiles);
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
            validate: validateEmptyString,
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
                hint: t('prompts.oDataAnnotationSettingsTooltip')
            },
            when: (answers: NewModelAnswers) => answers.addAnnotationMode
        } as EditorQuestion<NewModelAnswers>
    ];
}
