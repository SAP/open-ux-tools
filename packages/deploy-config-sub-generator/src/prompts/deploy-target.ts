import { isMTAInstalled, t } from '../utils';
import { extendWithOptions } from '@sap-ux/inquirer-common';
import type { Target } from '../types';
import type { Question, ListQuestion } from 'inquirer';
import type { CommonPromptOptions, YUIQuestion } from '@sap-ux/inquirer-common';

export enum promptNames {
    targetName = 'targetName'
}

/**
 * Returns the deployment target question.
 *
 * @param supportedTargets - supported targets
 * @param projectRoot - path to the project
 * @param extensionPromptOpts - extension prompt options
 * @param launchStandaloneFromYui - whether the generator is launched standalone from YUI
 * @returns - the deployment target question
 */
export function getDeployTargetQuestion(
    supportedTargets: Target[],
    projectRoot: string,
    extensionPromptOpts?: Record<string, CommonPromptOptions>,
    launchStandaloneFromYui?: boolean
): Question[] {
    const deployTargetPrompts = [
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

    return extensionPromptOpts && launchStandaloneFromYui
        ? extendWithOptions(deployTargetPrompts as YUIQuestion[], extensionPromptOpts)
        : deployTargetPrompts;
}
