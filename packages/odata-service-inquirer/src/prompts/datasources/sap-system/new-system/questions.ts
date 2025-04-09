/**
 * New system prompting questions for re-use in multiple sap-system datasource prompt sets.
 */
import { withCondition, type ListQuestion } from '@sap-ux/inquirer-common';
import type { Answers, Question } from 'inquirer';
import { t } from '../../../../i18n';
import type { OdataServicePromptOptions, SapSystemType } from '../../../../types';
import type { promptNames } from '../../../../types';
import { getAbapOnBTPSystemQuestions } from '../abap-on-btp/questions';
import { getAbapOnPremQuestions } from '../abap-on-prem/questions';
import { newSystemPromptNames } from './types';

/**
 * Internal only answers to service URL prompting not returned with OdataServiceAnswers.
 */
export interface NewSystemAnswers {
    [newSystemPromptNames.newSystemType]?: SapSystemType;
    [promptNames.userSystemName]?: string;
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
            getAbapOnBTPSystemQuestions(promptOptions) as Question[],
            (answers: Answers) => (answers as NewSystemAnswers).newSystemType === 'abapOnBtp'
        )
    );
    return questions;
}
