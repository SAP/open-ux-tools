/**
 * New system prompting questions for re-use in multiple sap-system datasource prompt sets.
 */
import { withCondition, type ListQuestion } from '@sap-ux/inquirer-common';
import type { Answers, Question } from 'inquirer';
import { t } from '../../../../i18n.js';
import type { ConnectedSystem, OdataServicePromptOptions, SapSystemType } from '../../../../types.js';
import { getAbapOnBTPSystemQuestions } from '../abap-on-btp/questions.js';
import { getAbapOnPremQuestions } from '../abap-on-prem/questions.js';
import { type NewSystemAnswers, newSystemPromptNames } from './types.js';

/**
 * Provides prompts that allow the creation of a new system connection.
 *
 * @param promptOptions options for the new system prompts see {@link OdataServicePromptOptions}
 * @param connectedSystem if available passing an already connected system connection will prevent re-authentication for re-entrance ticket and service keys connection types
 * @returns questions for creating a new system connection
 */
export function getNewSystemQuestions(
    promptOptions?: OdataServicePromptOptions,
    connectedSystem?: ConnectedSystem
): Question<NewSystemAnswers>[] {
    const questions: Question<NewSystemAnswers>[] = [
        {
            type: 'list',
            name: newSystemPromptNames.newSystemType,
            choices: [
                { name: t('prompts.newSystemType.choiceAbapOnBtp'), value: 'abapOnBtp' as SapSystemType },
                { name: t('prompts.newSystemType.choiceAbapOnPrem'), value: 'abapOnPrem' as SapSystemType }
            ],
            message: t('prompts.newSystemType.message')
        } as ListQuestion<NewSystemAnswers>
    ];
    questions.push(
        ...withCondition(
            getAbapOnPremQuestions(promptOptions) as Question[],
            (answers: Answers) => (answers as NewSystemAnswers).newSystemType === 'abapOnPrem'
        )
    );
    questions.push(
        ...withCondition(
            getAbapOnBTPSystemQuestions(promptOptions, connectedSystem) as Question[],
            (answers: Answers) => (answers as NewSystemAnswers).newSystemType === 'abapOnBtp'
        )
    );
    return questions;
}
