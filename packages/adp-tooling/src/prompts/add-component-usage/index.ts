import type {
    ConfirmQuestion,
    EditorQuestion,
    ListQuestion,
    InputQuestion,
    YUIQuestion
} from '@sap-ux/inquirer-common';
import type { UI5FlexLayer } from '@sap-ux/project-access';
import { CUSTOMER_BASE, ChangeType, type AddComponentUsageAnswers } from '../../types';
import { getChangesByType } from '../../base/change-utils';
import { t } from '../../i18n';
import { validateSpecialChars, validateJSON, validateContentDuplication } from '../../base/validators';

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
    const isCustomer = layer === CUSTOMER_BASE;

    const isLazyDropDownOptions = [
        { name: t('choices.true'), value: 'true' },
        { name: t('choices.false'), value: 'false' }
    ];
    return [
        {
            type: 'input',
            name: `id`,
            message: t('prompts.componentUsageIDLabel'),
            validate: (value: string) =>
                validateContentDuplication(
                    value,
                    'componentUsages',
                    componentUsageChangeFiles,
                    isCustomer,
                    t('prompts.componentUsageIDLabel'),
                    t('prompts.componentUsage')
                ),
            default: isCustomer ? 'customer.' : '',
            store: false,
            guiOptions: {
                mandatory: true,
                hint: t('prompts.componentUsageIDTooltip')
            }
        } as InputQuestion<AddComponentUsageAnswers>,
        {
            type: 'input',
            name: 'name',
            message: t('prompts.componentNameLabel'),
            validate: (value: string) => validateSpecialChars(value, t('prompts.componentNameLabel')),
            store: false,
            guiOptions: {
                mandatory: true,
                hint: t('prompts.componentNameTooltip')
            }
        } as InputQuestion<AddComponentUsageAnswers>,
        {
            type: 'list',
            name: 'isLazy',
            message: t('prompts.componentIsLazyLabel'),
            choices: isLazyDropDownOptions,
            default: isLazyDropDownOptions[1].value,
            store: false,
            guiOptions: {
                mandatory: true,
                hint: t('prompts.componentIsLazyTooltip')
            }
        } as ListQuestion<AddComponentUsageAnswers>,
        {
            type: 'editor',
            name: `settings`,
            message: t('prompts.componentSettingsLabel'),
            validate: (value: string) => {
                return validateJSON(value, t('prompts.componentSettingsLabel'));
            },
            store: false,
            guiOptions: {
                mandatory: false,
                hint: t('componentSettingsTooltip')
            }
        } as EditorQuestion<AddComponentUsageAnswers>,
        {
            type: 'editor',
            name: `data`,
            message: t('prompts.componentDataLabel'),
            validate: (value: string) => {
                return validateJSON(value, t('prompts.componentDataLabel'));
            },
            store: false,
            guiOptions: {
                mandatory: false,
                hint: t('componentTooltip', { input: t('prompts.componentDataLabel') })
            }
        } as EditorQuestion<AddComponentUsageAnswers>,
        {
            type: 'confirm',
            name: 'shouldAddLibrary',
            message: t('prompts.shouldAddLibraryLabel'),
            default: false,
            guiOptions: {
                hint: t('prompts.shouldAddLibraryTooltip')
            }
        } as ConfirmQuestion<AddComponentUsageAnswers>,
        {
            type: 'input',
            name: 'library',
            message: t('prompts.componentLibraryLabel'),
            guiOptions: {
                mandatory: true,
                hint: t('prompts.componentLibraryTooltip')
            },
            validate: (value: string) =>
                validateContentDuplication(
                    value,
                    'libraries',
                    libraryChangeFiles,
                    isCustomer,
                    t('prompts.componentLibraryLabel'),
                    t('prompts.componentLibraryLabel')
                ),
            store: false,
            when: (answers: AddComponentUsageAnswers) => answers.shouldAddLibrary
        } as InputQuestion<AddComponentUsageAnswers>,
        {
            type: 'list',
            name: `libraryIsLazy`,
            message: t('prompts.componentLibraryIsLazyLabel'),
            choices: isLazyDropDownOptions,
            default: isLazyDropDownOptions[1].value,
            store: false,
            guiOptions: {
                mandatory: true,
                hint: t('prompts.componentLibraryIsLazyTooltip')
            },
            when: (answers: AddComponentUsageAnswers) => answers.shouldAddLibrary
        } as ListQuestion<AddComponentUsageAnswers>
    ];
}
