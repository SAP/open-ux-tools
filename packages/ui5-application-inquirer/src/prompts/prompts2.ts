import { getUI5ThemesChoices } from '@sap-ux/inquirer-common';
import { defaultVersion, getDefaultUI5Theme, minUi5VersionSupportingCodeAssist } from '@sap-ux/ui5-info';
import { t } from '../i18n';
import { promptNames } from '../types';
import { isVersionIncluded } from './prompt-helpers';
import type { ListChoiceOptions } from 'inquirer';
import type { UI5ApplicationAnswers, UI5ApplicationQuestion } from '../types';
import type { ConfirmQuestion, ListQuestion } from '@sap-ux/inquirer-common';

/**
 * Get the `showAdvanced` prompt.
 *
 * @returns The `showAdvanced` prompt
 */
export function getShowAdvancedPrompt(): UI5ApplicationQuestion {
    return {
        type: 'confirm',
        name: 'showAdvanced',
        message: t('prompts.showAdvanced.message'),
        guiOptions: {
            hint: t('prompts.showAdvanced.tooltip')
        },
        default: false
    } as ConfirmQuestion<UI5ApplicationAnswers>;
}

/**
 * Get the `ui5Theme` prompt.
 *
 * @returns The `ui5Theme` prompt
 */
export function getUI5ThemePrompt(): UI5ApplicationQuestion {
    return {
        type: 'list',
        name: promptNames.ui5Theme,
        message: t('prompts.ui5Theme.message'),
        guiOptions: {
            applyDefaultWhenDirty: true,
            breadcrumb: true
        },
        choices: async ({ ui5Version = defaultVersion }): Promise<ListChoiceOptions[]> =>
            await getUI5ThemesChoices(ui5Version),
        default: ({ ui5Theme, ui5Version }: UI5ApplicationAnswers): string => {
            ui5Theme ??= getDefaultUI5Theme(ui5Version);
            return ui5Theme;
        }
    } as ListQuestion<UI5ApplicationAnswers>;
}

/**
 * Get the `enableEslint` prompt.
 *
 * @returns The `enableEslint` prompt
 */
export function getEnableEsLintPrompt(): UI5ApplicationQuestion {
    return {
        type: 'confirm',
        name: promptNames.enableEslint,
        message: t('prompts.enableEslint.message'),
        default: false,
        guiOptions: {
            breadcrumb: t('prompts.enableEslint.breadcrumb')
        }
    } as ConfirmQuestion<UI5ApplicationAnswers>;
}

/**
 * Get the `enableCodeAssist` prompt.
 *
 * @returns The `enableCodeAssist` prompt
 */
export function getEnableCodeAssistPrompt(): UI5ApplicationQuestion {
    return {
        when: (answers): boolean =>
            isVersionIncluded(answers?.ui5Version || defaultVersion, minUi5VersionSupportingCodeAssist),
        type: 'confirm',
        name: promptNames.enableCodeAssist,
        message: t('prompts.enableCodeAssist.message'),
        default: false,
        guiOptions: {
            breadcrumb: t('prompts.enableCodeAssist.breadcrumb')
        }
    } as ConfirmQuestion<UI5ApplicationAnswers>;
}

/**
 * Get the `skipAnnotations` prompt. Skipping annotation generation can be useful for CAP projects
 * where annotations may have been already created along with the service.
 *
 * @returns The `skipAnnotations` prompt
 */
export function getSkipAnnotationsPrompt(): UI5ApplicationQuestion {
    return {
        type: 'confirm',
        name: promptNames.skipAnnotations,
        message: t('prompts.skipAnnotations.message'),
        default: false,
        guiOptions: {
            breadcrumb: t('prompts.skipAnnotations.breadcrumb')
        }
    } as ConfirmQuestion<UI5ApplicationAnswers>;
}
