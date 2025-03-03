import { t } from 'i18next';
import { withCondition } from '@sap-ux/inquirer-common';
import { isMTAInstalled } from '../utils';
import type { Target } from '../types';
import type { Question, ListQuestion, Answers } from 'inquirer';

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
 * Returns prompts for the target deployment and wraps in the config update prompt if found.
 *
 * @param projectRoot - path to project
 * @param supportedTargets - the supported deployment targets
 * @param configUpdatePrompts - confirm config update prompts
 * @returns - the list of questions merged
 */
export function getDeployTargetPrompts(
    projectRoot: string,
    supportedTargets: Target[],
    configUpdatePrompts: Question[] = []
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
