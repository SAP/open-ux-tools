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
import { ChangeType, type NewModelAnswers } from '../../types';
import { isCustomerBase, isCFEnvironment } from '../../base/helper';
import {
    validateContentDuplication,
    validateNonEmptyNoSpaces,
    validateJSON,
    isNotEmptyString
} from '../../base/validators';

const oDataVersions = [
    { name: '2.0', value: '2.0' },
    { name: '4.0', value: '4.0' }
];

/**
 * Validates that two field values are not the same.
 *
 * @param fieldValue The value of the first field.
 * @param comparativeValue The value of the second field to compare against.
 * @param value1 The name of the first value.
 * @param value2 The name of the second value.
 * @returns {string | boolean} An error message if the values are the same, or true if they are different.
 */
export function validateDuplicateName(
    fieldValue: string,
    comparativeValue: string,
    value1: string,
    value2: string
): string | boolean {
    return fieldValue === comparativeValue ? t('validators.errorDuplicateNames', { value1, value2 }) : true;
}

/**
 * Gets the prompts for adding the new model.
 *
 * @param {string} projectPath - The root path of the project.
 * @param {UI5FlexLayer} layer - UI5 Flex layer.
 * @returns {YUIQuestion<NewModelAnswers>[]} The questions/prompts.
 */
export function getPrompts(projectPath: string, layer: UI5FlexLayer): YUIQuestion<NewModelAnswers>[] {
    const isCustomer = isCustomerBase(layer);
    const defaultSeviceName = isCustomer ? 'customer.' : '';
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
                const duplicationResult = validateContentDuplication(
                    value,
                    'dataSource',
                    changeFiles,
                    isCustomer,
                    t('prompts.oDataServiceNameLabel'),
                    t('prompts.oDataService') + ' or ' + t('prompts.oDataAnnotation')
                );

                if (typeof duplicationResult === 'string') {
                    return duplicationResult;
                }

                return validateDuplicateName(
                    value,
                    answers.dataSourceName,
                    t('prompts.oDataServiceNameLabel'),
                    t('prompts.oDataAnnotationDataSourceNameLabel')
                );
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
            validate: (value: string) => validateNonEmptyNoSpaces(value, t('prompts.oDataServiceUriLabel')),
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
            validate: isNotEmptyString,
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
                return validateContentDuplication(
                    value,
                    'model',
                    changeFiles,
                    isCustomer,
                    t('prompts.oDataServiceModelNameLabel'),
                    t('prompts.sapUi5Model')
                );
            },
            store: false
        } as InputQuestion<NewModelAnswers>,
        {
            type: 'editor',
            name: 'modelSettings',
            message: t('prompts.oDataServiceModelSettingsLabel'),
            store: false,
            validate: (value: string) => validateJSON(value, t('prompts.oDataServiceModelSettingsLabel')),
            guiOptions: {
                mandatory: false,
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
                const duplicationResult = validateContentDuplication(
                    value,
                    'dataSource',
                    changeFiles,
                    isCustomer,
                    t('prompts.oDataAnnotationDataSourceNameLabel'),
                    t('prompts.oDataAnnotation') + ' or ' + t('prompts.oDataService')
                );

                if (typeof duplicationResult === 'string') {
                    return duplicationResult;
                }

                return validateDuplicateName(
                    value,
                    answers.name,
                    t('prompts.oDataAnnotationDataSourceNameLabel'),
                    t('prompts.oDataServiceNameLabel')
                );
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
            validate: (value: string) =>
                validateNonEmptyNoSpaces(value, t('prompts.oDataAnnotationDataSourceUriLabel')),
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
            validate: (value: string) => validateJSON(value, t('prompts.oDataAnnotationSettingsLabel')),
            store: false,
            guiOptions: {
                mandatory: false,
                hint: t('prompts.oDataAnnotationSettingsTooltip')
            },
            when: (answers: NewModelAnswers) => answers.addAnnotationMode
        } as EditorQuestion<NewModelAnswers>
    ];
}
