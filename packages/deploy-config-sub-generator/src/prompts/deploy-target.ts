import { isMTAInstalled, promptNames, t } from '../utils/index.js';
import type { Target } from '../types/index.js';
import type { ListQuestion, YUIQuestion } from '@sap-ux/inquirer-common';

/**
 * Returns the deployment target question.
 *
 * @param supportedTargets - supported targets
 * @param projectRoot - path to the project
 * @returns - the deployment target question
 */
export function getDeployTargetQuestion(supportedTargets: Target[], projectRoot: string): YUIQuestion[] {
    const question: ListQuestion = {
        type: 'list',
        name: promptNames.targetName,
        guiOptions: {
            breadcrumb: t('prompts.deployTarget.breadcrumb')
        },
        message: t('prompts.deployTarget.message'),
        default: (): string => supportedTargets[0].name,
        validate: (choice: string): boolean | string => isMTAInstalled(choice, projectRoot),
        choices: supportedTargets.map((target) => ({ name: target.description, value: target.name }))
    };
    return [question];
}
