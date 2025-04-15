import { getUI5ThemesChoices, type ConfirmQuestion, type ListQuestion } from '@sap-ux/inquirer-common';
import { defaultVersion, getDefaultUI5Theme, minUi5VersionSupportingCodeAssist } from '@sap-ux/ui5-info';
import { t } from '../../i18n';
import { promptNames } from '../../types';
import { isVersionIncluded } from '../prompt-helpers';
import type { UI5ApplicationAnswers, UI5ApplicationQuestion } from '../../types';
import type { ListChoiceOptions } from 'inquirer';

/**
 * Get the `ui5Theme` prompt.
 *
 * @returns The `ui5Theme` prompt
 */
export function getUI5ThemePrompt(): UI5ApplicationQuestion {
    return {
        type: 'list',
        name: promptNames.ui5Theme,
        message: t('prompts.advanced.ui5Theme.message'),
        guiOptions: {
            applyDefaultWhenDirty: true,
            breadcrumb: true
        },
        choices: ({ ui5Version = defaultVersion }): ListChoiceOptions[] => getUI5ThemesChoices(ui5Version),
        default: ({ ui5Theme, ui5Version }: UI5ApplicationAnswers): string => {
            if (!ui5Theme) {
                ui5Theme = getDefaultUI5Theme(ui5Version);
            }
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
        message: t('prompts.advanced.enableEslint.message'),
        default: false,
        guiOptions: {
            breadcrumb: t('prompts.advanced.enableEslint.breadcrumb')
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
        message: t('prompts.advanced.enableCodeAssist.message'),
        default: false,
        guiOptions: {
            breadcrumb: t('prompts.advanced.enableCodeAssist.breadcrumb')
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
        message: t('prompts.advanced.skipAnnotations.message'),
        default: false,
        guiOptions: {
            breadcrumb: t('prompts.advanced.skipAnnotations.breadcrumb')
        }
    } as ConfirmQuestion<UI5ApplicationAnswers>;
}
