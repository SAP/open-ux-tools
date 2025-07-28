import { isMTAInstalled, promptNames, t } from '../utils';
import type { Target } from '../types';
import type { Question, ListQuestion } from 'inquirer';

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
            name: promptNames.targetName,
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
