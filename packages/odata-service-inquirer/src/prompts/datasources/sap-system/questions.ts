/**
 * Questions that are shared across all sap system datasource types
 *
 */

import { Severity } from '@sap-devx/yeoman-ui-types';
import { withCondition } from '@sap-ux/inquirer-common';
import { BackendSystem } from '@sap-ux/store';
import type { Answers, InputQuestion, ListQuestion, Question } from 'inquirer';
import { t } from '../../../i18n';
import type { OdataServiceAnswers, SapSystemType } from '../../../types';
import { PromptState } from '../../../utils';
import LoggerHelper from '../../logger-helper';
import type { AbapOnPremAnswers } from './abap-on-prem/questions';
import { getAbapOnPremQuestions } from './abap-on-prem/questions';
import { suggestSystemName } from './prompt-helpers';
import { validateSystemName } from './validators';

// New system choice value is a hard to guess string to avoid conflicts with existing system names or user named systems
// since it will be used as a new system value in the system selection prompt.
export const newSystemChoiceValue = '!@£*&937newSystem*X~qy^' as const;

const newSystemPromptNames = {
    newSystemType: 'newSystemType',
    newSystemName: 'newSystemName'
} as const;

/**
 * Internal only answers to service URL prompting not returned with OdataServiceAnswers.
 */
export interface NewSystemAnswers extends OdataServiceAnswers {
    [newSystemPromptNames.newSystemType]?: SapSystemType;
    [newSystemPromptNames.newSystemName]?: string;
}

const systemSelectionPromptNames = {
    system: 'system'
} as const;

// todo: System selection prompt not yet implemented
export interface SystemSelectionAnswer extends OdataServiceAnswers {
    [systemSelectionPromptNames.system]?: string;
}

/**
 * Provides prompts that allow the creation of a new system connection.
 *
 * @returns questions for creating a new system connection
 */
export function getNewSystemQuestions(): Question<NewSystemAnswers>[] {
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
            getAbapOnPremQuestions() as Question[],
            (answers: Answers) => (answers as NewSystemAnswers).newSystemType === 'abapOnPrem'
        )
    );

    let defaultSystemName: string;
    questions.push({
        type: 'input',
        guiOptions: {
            hint: t('prompts.systemName.hint'),
            applyDefaultWhenDirty: true,
            breadcrumb: true
        },
        name: newSystemPromptNames.newSystemName,
        message: t('prompts.systemName.message'),
        default: async (answers: AbapOnPremAnswers & NewSystemAnswers) => {
            if (answers.newSystemType === 'abapOnPrem' && answers.systemUrl) {
                defaultSystemName = await suggestSystemName(answers.systemUrl, answers.sapClient);
            }
            return defaultSystemName;
        },
        validate: async (systemName: string, answers: AbapOnPremAnswers & NewSystemAnswers) => {
            let validationResult: boolean | string = false;
            // Dont validate the suggested default system name
            if (systemName === defaultSystemName) {
                validationResult = true;
            }
            validationResult = await validateSystemName(systemName);

            if (validationResult === true) {
                const backendSystem = new BackendSystem({
                    name: systemName,
                    url: answers.systemUrl!,
                    client: answers.sapClient,
                    username: answers.abapSystemUsername,
                    password: answers.abapSystemUsername
                });
                if (PromptState.odataService.connectedSystem) {
                    PromptState.odataService.connectedSystem.backendSystem = backendSystem;
                }
            }
            return validationResult;
        }
    } as InputQuestion<NewSystemAnswers>);

    return questions;
}
