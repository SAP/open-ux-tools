import { MessageType } from '@sap-devx/yeoman-ui-types';
import type { AppWizard } from '@sap-devx/yeoman-ui-types';

import type { ToolsLogger } from '@sap-ux/logger';
import type { CfConfig } from '@sap-ux/adp-tooling';
import { isMtaProject } from '@sap-ux/adp-tooling';
import { getDefaultTargetFolder } from '@sap-ux/fiori-generator-shared';
import type { InputQuestion, ListQuestion, YUIQuestion } from '@sap-ux/inquirer-common';

import { t } from '../../utils/i18n.js';
import { MtaMode, TargetEnv } from '../types.js';
import { getTargetEnvAdditionalMessages } from './helper/additional-messages.js';
import { validateEnvironment, validateMtaId, validateProjectPath } from './helper/validators.js';
import type { ProjectLocationAnswers, TargetEnvAnswers, TargetEnvQuestion } from '../types.js';

type EnvironmentChoice = { name: string; value: TargetEnv };

/**
 * Returns the target environment prompt.
 *
 * @param {AppWizard} appWizard - The app wizard instance.
 * @param {boolean} isCfInstalled - Whether Cloud Foundry is installed.
 * @param {boolean} isCFLoggedIn - Whether Cloud Foundry is logged in.
 * @param {CfConfig} cfConfig - The CF config service instance.
 * @returns {object[]} The target environment prompt.
 */
export function getTargetEnvPrompt(
    appWizard: AppWizard,
    isCfInstalled: boolean,
    isCFLoggedIn: boolean,
    cfConfig: CfConfig
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
        validate: (value: string) => validateEnvironment(value, isCFLoggedIn, cfConfig),
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
        choices.push({ name: 'SAP BTP, Cloud Foundry environment', value: TargetEnv.CF });
    } else {
        appWizard.showInformation(t('error.cfNotInstalled'), MessageType.prompt);
    }

    return choices;
}

/**
 * Returns the MTA mode prompt: create a new MTA project or use an existing one.
 *
 * @returns {YUIQuestion<ProjectLocationAnswers>} The MTA mode prompt.
 */
export function getMtaModePrompt(): YUIQuestion<ProjectLocationAnswers> {
    return {
        type: 'list',
        name: 'mtaMode',
        message: t('prompts.mtaModeLabel'),
        choices: [
            { name: t('prompts.mtaModeNewLabel'), value: MtaMode.New },
            { name: t('prompts.mtaModeExistingLabel'), value: MtaMode.Existing }
        ],
        default: MtaMode.New,
        guiOptions: {
            mandatory: true,
            hint: t('prompts.mtaModeTooltip'),
            breadcrumb: t('prompts.mtaModeBreadcrumb')
        }
    } as ListQuestion<ProjectLocationAnswers>;
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
        validate: (value: string, answers?: ProjectLocationAnswers) =>
            validateProjectPath(value, logger, answers?.mtaMode),
        default: () => getDefaultTargetFolder(vscode),
        store: false
    } as InputQuestion<ProjectLocationAnswers>;
}

/**
 * Returns the MTA project name prompt, shown only when creating a new MTA project in a folder that is
 * not already an MTA project. When the selected root path already contains an `mta.yaml`, the project
 * name is taken from the existing project, so the prompt is hidden.
 *
 * @returns {YUIQuestion<ProjectLocationAnswers>} The MTA project name prompt.
 */
export function getMtaIdPrompt(): YUIQuestion<ProjectLocationAnswers> {
    return {
        type: 'input',
        name: 'mtaId',
        message: t('prompts.mtaIdLabel'),
        when: (answers: ProjectLocationAnswers) =>
            answers.mtaMode === MtaMode.New && !!answers.projectLocation && !isMtaProject(answers.projectLocation),
        validate: (value: string, answers?: ProjectLocationAnswers) => validateMtaId(value, answers?.projectLocation),
        guiOptions: {
            mandatory: true,
            hint: t('prompts.mtaIdTooltip'),
            breadcrumb: t('prompts.mtaIdBreadcrumb')
        },
        store: false
    } as InputQuestion<ProjectLocationAnswers>;
}
