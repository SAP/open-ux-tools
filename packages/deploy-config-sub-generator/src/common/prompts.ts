import { t } from '../utils/i18n';
import { isMTAInstalled } from '../utils';
import type { Question } from 'inquirer';
import type { ListQuestion } from '@sap-ux/inquirer-common';
import type { Target } from '../types';

/**
 * Returns the deploy target question.
 *
 * @param supportedTargets - supported targets
 * @param projectPath - path to the project
 * @returns - the deploy target question
 */
export function getDeployTargetQuestion(supportedTargets: Target[], projectPath: string): Question[] {
    return [
        {
            type: 'list',
            name: 'targetName',
            guiOptions: {
                breadcrumb: t('LABEL_TARGET_SYSTEM_TYPE_BREADCRUMB')
            },
            message: t('PROMPT_APP_CHOOSE_TARGET'),
            default: (): string => supportedTargets[0].name,
            validate: (choice: string): boolean | string => isMTAInstalled(choice, projectPath),
            choices: supportedTargets.map((target) => ({ name: target.description, value: target.name }))
        } as ListQuestion
    ];
}
