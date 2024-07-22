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
            message: t('prompts.component.usageIdLabel'),
            validate: (value: string) =>
                validateContentDuplication(
                    value,
                    'componentUsages',
                    componentUsageChangeFiles,
                    isCustomer,
                    t('prompts.component.usageIdLabel'),
                    t('prompts.component.usage')
                ),
            default: isCustomer ? 'customer.' : '',
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
            validate: (value: string) => validateSpecialChars(value, t('prompts.component.nameLabel')),
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
            validate: (value: string) => {
                return validateJSON(value, t('prompts.component.settingsLabel'));
            },
            store: false,
            guiOptions: {
                mandatory: false,
                hint: t('prompts.component.tooltip', { input: t('prompts.component.settingsLabel') })
            }
        } as EditorQuestion<AddComponentUsageAnswers>,
        {
            type: 'editor',
            name: `data`,
            message: t('prompts.component.dataLabel'),
            validate: (value: string) => {
                return validateJSON(value, t('prompts.component.dataLabel'));
            },
            store: false,
            guiOptions: {
                mandatory: false,
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
            validate: (value: string) =>
                validateContentDuplication(
                    value,
                    'libraries',
                    libraryChangeFiles,
                    isCustomer,
                    t('prompts.component.libraryLabel'),
                    t('prompts.component.libraryLabel')
                ),
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
