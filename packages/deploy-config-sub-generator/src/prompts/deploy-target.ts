import { withCondition } from '@sap-ux/inquirer-common';
import { t } from 'i18next';
import { Question, ListQuestion, Answers } from 'inquirer';
import { Target } from '../types';
import { isMTAInstalled } from '../utils';

/**
 * Returns the deployment target question.
 *
 * @param supportedTargets - supported targets
 * @param projectRoot - path to the project
 * @returns - the deployment target question
 */
export function getDeployTargetQuestion(supportedTargets: Target[], projectRoot: string): Question[] {
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
    let questions: Question[] = getDeployTargetQuestion(supportedTargets, projectRoot);
    if (configUpdatePrompts.length > 0) {
        questions = withCondition(
            getDeployTargetQuestion(supportedTargets, projectRoot),
            (answers: Answers) => answers.confirmConfigUpdate
        );
        questions.unshift(...configUpdatePrompts);
    }
    return questions;
}
