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
import { isInternalUsage, isCFEnvironment } from '../../base/helper';
import {
    validateDuplication,
    validateDuplicateName,
    validateUri,
    validateAnnotationJSON,
    isNotEmptyString
} from '../../base/validators';

function getDefaultServiceName(isInternalUsage: boolean): string {
    return isInternalUsage ? '' : 'customer.';
}

function getODataVersionChoices(): {
    name: string;
    value: any;
}[] {
    return [
        { name: '2.0', value: '2.0' },
        { name: '4.0', value: '4.0' }
    ];
}

/**
 * Gets the prompts for adding the new model.
 *
 * @returns {YUIQuestion<ChangeDataSourceAnswers>[]} The questions/prompts.
 */
export function getPrompts(projectPath: string, layer: UI5FlexLayer): YUIQuestion<NewModelAnswers>[] {
    const isInternal = isInternalUsage(layer);
    const oDataVersions = getODataVersionChoices();
    const defaultSeviceName = getDefaultServiceName(isInternal);
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
                const duplicationResult = validateDuplication(
                    value,
                    'dataSource',
                    changeFiles,
                    !isInternal,
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
            validate: (value: string) => validateUri(value, t('prompts.oDataServiceUriLabel')),
            store: false
        } as InputQuestion<NewModelAnswers>,
        {
            type: 'list',
            name: 'version',
            message: t('prompts.oDataServiceVersionLabel'),
            choices: oDataVersions,
            default: (answers: NewModelAnswers) => {
                if (answers.uri && answers.uri.startsWith(isCFEnv ? 'odata/v4/' : '/sap/opu/odata4/')) {
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
                return validateDuplication(
                    value,
                    'model',
                    changeFiles,
                    !isInternal,
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
            validate: (value: string) => validateAnnotationJSON(value, t('prompts.oDataServiceModelSettingsLabel')),
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
                const duplicationResult = validateDuplication(
                    value,
                    'dataSource',
                    changeFiles,
                    !isInternal,
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
            validate: (value: string) => validateUri(value, t('prompts.oDataAnnotationDataSourceUriLabel')),
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
            validate: (value: string) => validateAnnotationJSON(value, t('prompts.oDataAnnotationSettingsLabel')),
            store: false,
            guiOptions: {
                mandatory: false,
                hint: t('prompts.oDataAnnotationSettingsTooltip')
            },
            when: (answers: NewModelAnswers) => answers.addAnnotationMode
        } as EditorQuestion<NewModelAnswers>
    ];
}
