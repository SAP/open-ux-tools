import { isMTAInstalled, t } from '../utils';
import type { Question } from 'inquirer';
import type { ListQuestion } from '@sap-ux/inquirer-common';
import type { Target } from '../types';

/**
 * Returns the deployment target question.
 *
 * @param supportedTargets - supported targets
 * @param projectPath - path to the project
 * @returns - the deployment target question
 */
export function getDeployTargetQuestion(supportedTargets: Target[], projectPath: string): Question[] {
    return [
        {
            type: 'list',
            name: 'targetName',
            guiOptions: {
                breadcrumb: t('prompts.deployTarget.breadcrumb')
            },
            message: t('prompts.deployTarget.message'),
            default: (): string => supportedTargets[0].name,
            validate: (choice: string): boolean | string => isMTAInstalled(choice, projectPath),
            choices: supportedTargets.map((target) => ({ name: target.description, value: target.name }))
        } as ListQuestion
    ];
}
