import type { FDCService } from '@sap-ux/adp-tooling';
import { MessageType } from '@sap-devx/yeoman-ui-types';
import type { AppWizard } from '@sap-devx/yeoman-ui-types';
import type { ListQuestion } from '@sap-ux/inquirer-common';

import { validateEnvironment } from './helper/validators';
import { TargetEnv, type TargetEnvAnswers, type TargetEnvQuestion } from '../types';

type EnvironmentChoice = { name: string; value: TargetEnv };

/**
 * Returns the target environment prompt.
 *
 * @param {AppWizard} appWizard - The app wizard instance.
 * @param {boolean} isCfInstalled - Whether Cloud Foundry is installed.
 * @param {FDCService} fdcService - The FDC service instance.
 * @returns {object[]} The target environment prompt.
 */
export function getTargetEnvPrompt(
    appWizard: AppWizard,
    isCfInstalled: boolean,
    fdcService: FDCService
): TargetEnvQuestion {
    return {
        type: 'list',
        name: 'targetEnv',
        message: 'Select environment',
        choices: () => getEnvironments(appWizard, isCfInstalled),
        default: () => getEnvironments(appWizard, isCfInstalled)[0]?.name,
        guiOptions: {
            mandatory: true,
            hint: 'Select the target environment for your Adaptation Project.'
        },
        validate: (value: string) => validateEnvironment(value, 'Target environment', fdcService)
    } as ListQuestion<TargetEnvAnswers>;
}

/**
 * Returns the environments.
 *
 * @param {AppWizard} appWizard - The app wizard instance.
 * @param {boolean} isCfInstalled - Whether Cloud Foundry is installed.
 * @returns {object[]} The environments.
 */
export function getEnvironments(appWizard: AppWizard, isCfInstalled: boolean): EnvironmentChoice[] {
    const choices: EnvironmentChoice[] = [{ name: 'ABAP', value: TargetEnv.ABAP }];

    if (isCfInstalled) {
        choices.push({ name: 'Cloud Foundry', value: TargetEnv.CF });
    } else {
        appWizard.showInformation('Cloud Foundry is not installed in your space.', MessageType.prompt);
    }

    return choices;
}
