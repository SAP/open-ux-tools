import type { Prompts as YeomanUiSteps, IPrompt } from '@sap-devx/yeoman-ui-types';

import { t } from './i18n';

/**
 * Returns the list of base wizard pages used in the Adaptation Project.
 *
 * @returns {IPrompt[]} The list of static wizard steps to show initially.
 */
export function getWizardPages(): IPrompt[] {
    return [
        {
            name: t('yuiNavSteps.configurationName'),
            description: t('yuiNavSteps.configurationDescr')
        },
        {
            name: t('yuiNavSteps.projectAttributesName'),
            description: t('yuiNavSteps.projectAttributesDescr')
        }
    ];
}

/**
 * Returns the FLP configuration page step.
 *
 * @param {boolean} showTileSettingsPage - Flag to determine if the tile settings page should be shown.
 * @param {string} projectName - The name of the project.
 * @returns {IPrompt} The FLP configuration wizard page.
 */
export function getFlpPages(showTileSettingsPage: boolean, projectName: string): IPrompt[] {
    const pages = [
        {
            name: t('yuiNavSteps.flpConfigName'),
            description: t('yuiNavSteps.flpConfigDescr', { projectName })
        }
    ];
    if (showTileSettingsPage) {
        pages.unshift({
            name: t('yuiNavSteps.tileSettingsName'),
            description: t('yuiNavSteps.tileSettingsDescr', { projectName })
        });
    }

    return pages;
}

/**
 * Updates the FLP wizard steps by adding or removing FLP-related pages based on the presence of a base app inbound.
 *
 * @param {boolean} hasBaseAppInbound - Indicates if the base app inbound exists.
 * @param {YeomanUiSteps} prompts - The Yeoman UI Prompts container object.
 * @param {string} projectName - The name of the project.
 * @param {boolean} [shouldAdd] - Whether to add (`true`) or remove (`false`) the steps.
 */
export function updateFlpWizardSteps(
    hasBaseAppInbound: boolean,
    prompts: YeomanUiSteps,
    projectName: string,
    shouldAdd: boolean = true
): void {
    const pages = getFlpPages(hasBaseAppInbound, projectName);
    if (pages.length === 2) {
        updateWizardSteps(prompts, pages[0], t('yuiNavSteps.deployConfigName'), shouldAdd);
        updateWizardSteps(prompts, pages[1], t('yuiNavSteps.tileSettingsName'), shouldAdd);
        return;
    }

    updateWizardSteps(prompts, pages[0], t('yuiNavSteps.deployConfigName'), shouldAdd);
}

/**
 * Returns the deploy configuration page step.
 *
 * @returns {IPrompt} The deployment configuration wizard page.
 */
export function getDeployPage(): IPrompt {
    return { name: t('yuiNavSteps.deployConfigName'), description: t('yuiNavSteps.deployConfigDescr') };
}

/**
 * Dynamically adds or removes a step in the Yeoman UI wizard.
 *
 * If `shouldAdd` is true and the step is not already in the list, it is inserted
 * after the step with name `insertAfter` (or at the end if not found).
 * If the step is already in the list and `shouldAdd` is false, it is removed.
 *
 * If the step exists and needs to be moved (based on desired insertion point),
 * it is repositioned accordingly.
 *
 * @param {YeomanUiSteps} prompts - The Yeoman UI Prompts container object.
 * @param {IPrompt} step - The step to add or remove.
 * @param {string} [insertAfter] - Optional name of the step after which to insert.
 * @param {boolean} [shouldAdd] - Whether to add (`true`) or remove (`false`) the step.
 */
export function updateWizardSteps(
    prompts: YeomanUiSteps,
    step: IPrompt,
    insertAfter: string = '',
    shouldAdd: boolean = true
): void {
    const pages: IPrompt[] = prompts['items'];

    const existingIdx = pages.findIndex((p) => p.name === step.name);

    if (shouldAdd) {
        // Decide the desired index
        const afterIdx = pages.findIndex((p) => p.name === insertAfter);
        const targetIdx = afterIdx === -1 ? pages.length : afterIdx + 1;

        // Page already there → move it
        if (existingIdx !== -1) {
            if (existingIdx === targetIdx) {
                return;
            }
            const [existingStep] = pages.splice(existingIdx, 1);
            prompts.splice(targetIdx > existingIdx ? targetIdx - 1 : targetIdx, 0, [existingStep]);
            return;
        }

        // Page not there → insert it
        prompts.splice(targetIdx, 0, [step]);
    } else if (existingIdx !== -1) {
        prompts.splice(existingIdx, 1, []);
    }
}
