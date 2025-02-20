import { basename } from 'path';
import { isMTAInstalled, t } from '../utils';
import type { Answers, Question } from 'inquirer';
import { type ListQuestion, withCondition } from '@sap-ux/inquirer-common';
import type { DeployConfigOptions, Target } from '../types';
import { getHostEnvironment, hostEnvironment } from '@sap-ux/fiori-generator-shared';
import { getConfirmConfigUpdatePrompt, TargetName } from '@sap-ux/deploy-config-generator-shared';
import type { AbapDeployConfigQuestion } from '@sap-ux/abap-deploy-config-sub-generator';
import type { CfDeployConfigQuestions } from '@sap-ux/cf-deploy-config-sub-generator';

/**
 * Returns the deployment target question.
 *
 * @param supportedTargets - supported targets
 * @param projectRoot - path to the project
 * @returns - the deployment target question
 */
function getDeployTargetPrompt(supportedTargets: Target[], projectRoot: string): Question[] {
    return [
        {
            type: 'list',
            name: 'targetName',
            guiOptions: {
                breadcrumb: t('prompts.deployTarget.breadcrumb')
            },
            message: t('prompts.deployTarget.message'),
            default: (): string => supportedTargets[0].name,
            validate: (choice: string): boolean | string => isMTAInstalled(choice, projectRoot),
            choices: supportedTargets.map((target) => ({ name: target.description, value: target.name }))
        } as ListQuestion
    ];
}

/**
 * Directly prompts for the target deployment.
 *
 * @param supportedTargets - the supported deployment targets
 * @param configUpdatePrompts - confirm config update prompts
 * @param projectRoot - path to project
 * @returns - the list of questions merged
 */
export function getDeployTargetPrompts(
    supportedTargets: Target[],
    configUpdatePrompts: Question[] = [],
    projectRoot: string
): Question[] {
    let questions: Question[] = getDeployTargetPrompt(supportedTargets, projectRoot);
    if (configUpdatePrompts.length > 0) {
        questions = withCondition(
            getDeployTargetPrompt(supportedTargets, projectRoot),
            (answers: Answers) => answers.confirmConfigUpdate
        );
        questions.unshift(...configUpdatePrompts);
    }
    return questions;
}

/**
 * Get prompt to confirm the configuration is to be updated.
 *
 * @param launchStandaloneFromYui - is generator launched from another generator
 * @param opts - the prompt opts for the confirm config update prompt
 * @param opts.show Whether the prompt should be shown.
 * @param opts.configType The type of configuration being updated. This will be added to the start of the prompt message.
 * @returns List of Questions
 */
export function getConfirmConfigUpdatePrompts(
    launchStandaloneFromYui: boolean,
    { show = undefined, configType = undefined }: DeployConfigOptions['confirmConfigUpdate'] = {}
): Question[] {
    const configUpdatePrompts: Question[] = [];
    // Show confirm prompt only if launched standalone or on CLI since Fiori gen will show UI warn message in previous step
    if ((getHostEnvironment() === hostEnvironment.cli || launchStandaloneFromYui) && show) {
        configUpdatePrompts.push(...getConfirmConfigUpdatePrompt(configType));
    }
    return configUpdatePrompts;
}

/**
 * Merges all prompts for deployment configuration.
 *
 * @param projectRoot - the project root path
 * @param opts - the prompt opts for the deployment configuration prompts
 * @param opts.supportedTargets - the support deployment targets
 * @param opts.abapPrompts - abap specific prompts
 * @param opts.cfPrompts - cf specific prompts
 * @param opts.configUpdatePrompts - confirm config update prompts
 * @returns - all the different prompts combined
 */
export function combineAllPrompts(
    projectRoot: string,
    {
        supportedTargets,
        abapPrompts,
        cfPrompts,
        configUpdatePrompts = []
    }: {
        supportedTargets: Target[];
        abapPrompts: AbapDeployConfigQuestion[];
        cfPrompts: CfDeployConfigQuestions[];
        configUpdatePrompts: Question[];
    }
): Question[] {
    let questions = getDeployTargetPrompt(supportedTargets, projectRoot);
    questions.push(
        ...withCondition(abapPrompts as Question[], (answers: Answers) => answers.targetName === TargetName.ABAP)
    );
    questions.push(...withCondition(cfPrompts, (answers: Answers) => answers.targetName === TargetName.CF));
    if (configUpdatePrompts.length > 0) {
        questions = withCondition(questions, (answers: Answers) => answers.confirmConfigUpdate);
        questions.unshift(...configUpdatePrompts);
    }
    return questions;
}

/**
 * Returns the details for the YUI prompt.
 *
 * @param appRootPath - path to the application to be displayed in YUI step description
 * @returns step details
 */
export function getYUIDetails(appRootPath: string): { name: string; description: string }[] {
    return [
        {
            name: 'Deployment Configuration',
            description: `Configure Deployment settings - ${basename(appRootPath)}`
        }
    ];
}
