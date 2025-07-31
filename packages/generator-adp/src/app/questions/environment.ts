import { type AppWizard, MessageType } from '@sap-devx/yeoman-ui-types';
import { isCFInstalled } from '@sap-ux/adp-tooling';
import type { ListQuestion } from '@sap-ux/inquirer-common';
import { t } from '../../utils/i18n';
import type { TargetEnvironment } from '../types';
import { getEnvironmentChoices } from './helper/choices';
import { validateTargetEnvironment } from './helper/validators';

interface EnvironmentAnswer {
    targetEnvironment: TargetEnvironment;
}

/**
 * Creates the target environment prompt configuration.
 *
 * @param vscode - The instance to the VS Code env.
 * @param {AppWizard} appWizard - The YeomanUI wizard.
 * @returns The target environment prompt as a {@link ListQuestion<EnvironmentAnswer>}.
 */
export function getTargetEnvironmentPrompt(vscode: any, appWizard: AppWizard): ListQuestion<EnvironmentAnswer> {
    return {
        type: 'list',
        name: 'targetEnvironment',
        message: t('prompts.targetEnvironmentLabel'),
        choices: () => getEnvironmentChoices(),
        default: () => getEnvironmentChoices()[0]?.value,
        guiOptions: {
            mandatory: true,
            hint: t('prompts.targetEnvironmentTooltip')
        },
        validate: (value: TargetEnvironment) => validateTargetEnvironment(value, vscode),
        when: async () => {
            await showCFNotInstalledWarningIfNeeded(appWizard);
            return true;
        }
    };
}

async function showCFNotInstalledWarningIfNeeded(appWizard: AppWizard): Promise<void> {
    if (!(await isCFInstalled())) {
        appWizard.showInformation(t('prompts.cfNotInstalledWarning'), MessageType.prompt);
    }
}
