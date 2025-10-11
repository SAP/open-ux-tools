import { MessageType } from '@sap-devx/yeoman-ui-types';
import type { AppWizard } from '@sap-devx/yeoman-ui-types';

import type { ToolsLogger } from '@sap-ux/logger';
import type { CfConfig } from '@sap-ux/adp-tooling';
import { getDefaultTargetFolder } from '@sap-ux/fiori-generator-shared';
import type { InputQuestion, ListQuestion, YUIQuestion } from '@sap-ux/inquirer-common';

import { t } from '../../utils/i18n';
import { TargetEnv } from '../types';
import { getTargetEnvAdditionalMessages } from './helper/additional-messages';
import { validateEnvironment, validateProjectPath } from './helper/validators';
import type { ProjectLocationAnswers, TargetEnvAnswers, TargetEnvQuestion } from '../types';

type EnvironmentChoice = { name: string; value: TargetEnv };

/**
 * Returns the target environment prompt.
 *
 * @param {AppWizard} appWizard - The app wizard instance.
 * @param {boolean} isCfInstalled - Whether Cloud Foundry is installed.
 * @param {boolean} isCFLoggedIn - Whether Cloud Foundry is logged in.
 * @param {CfConfig} cfConfig - The CF config service instance.
 * @param {any} vscode - The vscode instance.
 * @returns {object[]} The target environment prompt.
 */
export function getTargetEnvPrompt(
    appWizard: AppWizard,
    isCfInstalled: boolean,
    isCFLoggedIn: boolean,
    cfConfig: CfConfig,
    vscode: any
): TargetEnvQuestion {
    return {
        type: 'list',
        name: 'targetEnv',
        message: t('prompts.targetEnvLabel'),
        choices: () => getEnvironments(appWizard, isCfInstalled),
        default: () => getEnvironments(appWizard, isCfInstalled)[0]?.name,
        guiOptions: {
            mandatory: true,
            hint: t('prompts.targetEnvTooltip'),
            breadcrumb: t('prompts.targetEnvBreadcrumb')
        },
        validate: (value: string) => validateEnvironment(value, isCFLoggedIn, vscode),
        additionalMessages: (value: string) => getTargetEnvAdditionalMessages(value, isCFLoggedIn, cfConfig)
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
        appWizard.showInformation(t('error.cfNotInstalled'), MessageType.prompt);
    }

    return choices;
}

/**
 * Returns the project path prompt.
 *
 * @param {ToolsLogger} logger - The logger.
 * @param {any} vscode - The VSCode instance.
 * @returns {YUIQuestion<ProjectLocationAnswers>[]} The project path prompt.
 */
export function getProjectPathPrompt(logger: ToolsLogger, vscode: any): YUIQuestion<ProjectLocationAnswers> {
    return {
        type: 'input',
        name: 'projectLocation',
        guiOptions: {
            type: 'folder-browser',
            mandatory: true,
            hint: t('prompts.projectLocationTooltip'),
            breadcrumb: t('prompts.projectLocationBreadcrumb')
        },
        message: t('prompts.projectLocationLabel'),
        validate: (value: string) => validateProjectPath(value, logger),
        default: () => getDefaultTargetFolder(vscode),
        store: false
    } as InputQuestion<ProjectLocationAnswers>;
}
