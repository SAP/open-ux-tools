/**
 * New system prompting questions for re-use in multiple sap-system datasource prompt sets.
 */
import { Severity } from '@sap-devx/yeoman-ui-types';
import { withCondition } from '@sap-ux/inquirer-common';
import { BackendSystem } from '@sap-ux/store';
import type { Answers, InputQuestion, ListQuestion, Question } from 'inquirer';
import { t } from '../../../../i18n';
import type { OdataServiceAnswers, OdataServicePromptOptions, SapSystemType } from '../../../../types';
import { promptNames } from '../../../../types';
import { PromptState } from '../../../../utils';
import LoggerHelper from '../../../logger-helper';
import type { AbapOnPremAnswers } from '../abap-on-prem/questions';
import { getAbapOnPremQuestions } from '../abap-on-prem/questions';
import { suggestSystemName } from '../prompt-helpers';
import { validateSystemName } from '../validators';

// New system choice value is a hard to guess string to avoid conflicts with existing system names or user named systems
// since it will be used as a new system value in the system selection prompt.
export const newSystemChoiceValue = '!@£*&937newSystem*X~qy^';

const newSystemPromptNames = {
    newSystemType: 'newSystemType'
} as const;

/**
 * Internal only answers to service URL prompting not returned with OdataServiceAnswers.
 */
export interface NewSystemAnswers {
    [newSystemPromptNames.newSystemType]?: SapSystemType;
    [promptNames.userSystemName]?: string;
}

const systemSelectionPromptNames = {
    system: 'system'
} as const;

export interface SystemSelectionAnswer extends OdataServiceAnswers {
    [systemSelectionPromptNames.system]?: string;
}

/**
 * Provides prompts that allow the creation of a new system connection.
 *
 * @param promptOptions options for the new system prompts see {@link OdataServicePromptOptions}
 * @returns questions for creating a new system connection
 */
export function getNewSystemQuestions(promptOptions?: OdataServicePromptOptions): Question<NewSystemAnswers>[] {
    const questions: Question<NewSystemAnswers>[] = [
        {
            type: 'list',
            name: newSystemPromptNames.newSystemType,
            choices: [
                { name: t('prompts.newSystemType.choiceAbapOnBtp'), value: 'abapOnBtp' as SapSystemType },
                { name: t('prompts.newSystemType.choiceAbapOnPrem'), value: 'abapOnPrem' as SapSystemType }
            ],
            message: t('prompts.newSystemType.message'),
            additionalMessages: (systemType: SapSystemType) => {
                if (['abapOnBtp'].includes(systemType)) {
                    LoggerHelper.logger?.warn(t('prompts.systemType.notYetImplementedWarningMessage', { systemType }));
                    return {
                        message: t('prompts.systemType.notYetImplementedWarningMessage', { systemType }),
                        severity: Severity.warning
                    };
                }
            }
        } as ListQuestion<NewSystemAnswers>
    ];
    questions.push(
        ...withCondition(
            getAbapOnPremQuestions(promptOptions) as Question[],
            (answers: Answers) => (answers as NewSystemAnswers).newSystemType === 'abapOnPrem'
        )
    );

    return questions;
}

/**
 * Get a prompt for new system name.
 *
 * @returns the new system name prompt
 */
export function getUserSystemNameQuestion(): InputQuestion<NewSystemAnswers> {
    let defaultSystemName: string;
    let userModifiedSystemName: boolean = false;
    const newSystemNamePrompt = {
        type: 'input',
        guiOptions: {
            hint: t('prompts.systemName.hint'),
            applyDefaultWhenDirty: true,
            breadcrumb: true
        },
        name: promptNames.userSystemName,
        message: t('prompts.systemName.message'),
        default: async (answers: AbapOnPremAnswers & NewSystemAnswers) => {
            if (answers.newSystemType === 'abapOnPrem' && answers.systemUrl && !userModifiedSystemName) {
                defaultSystemName = await suggestSystemName(answers.systemUrl, answers.sapClient);
                return defaultSystemName;
            }
            return answers.userSystemName;
        },
        validate: async (systemName: string, answers: AbapOnPremAnswers & NewSystemAnswers) => {
            let isValid: string | boolean = false;
            // Dont validate the suggested default system name
            if (systemName === defaultSystemName) {
                isValid = true;
            } else {
                userModifiedSystemName = true;
                isValid = await validateSystemName(systemName);
            }
            if (isValid === true) {
                // Not the default system name, so the user modified
                const backendSystem = new BackendSystem({
                    name: systemName,
                    url: answers.systemUrl!,
                    client: answers.sapClient,
                    username: answers.abapSystemUsername,
                    password: answers.abapSystemPassword
                });
                if (PromptState.odataService.connectedSystem) {
                    PromptState.odataService.connectedSystem.backendSystem = backendSystem;
                }
            }
            return isValid;
        }
    } as InputQuestion<NewSystemAnswers>;

    return newSystemNamePrompt;
}
