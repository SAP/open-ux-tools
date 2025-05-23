import type { TileActionAnswers } from './types';
import type { ListQuestion, ConfirmQuestion, YUIQuestion, InputQuestion } from '@sap-ux/inquirer-common';
import { t } from '../utils/i18n';

export enum tileActions {
    REPLACE = 'replace',
    ADD = 'add'
}

/**
 * Returns a label prompt notifying there an existing FLP configuration.
 *
 * @returns {YUIQuestion<InputQuestion>} The label prompt for existing FLP configuration.
 */
export function getExistingFLPConfigPrompt(): YUIQuestion<InputQuestion> {
    return {
        type: 'input',
        name: 'existingFLPConfig',
        message: t('prompts.existingFLPConfig'),
        guiOptions: {
            type: 'label',
            mandatory: false
        }
    };
}

/**
 * Returns the list of questions for tile handling actions.
 *
 * @returns {YUIQuestion<TileActionAnswers>[]} Array of tile action questions.
 */
export function getTileActionsQuestions(): YUIQuestion<TileActionAnswers>[] {
    return [
        {
            type: 'list',
            name: 'tileHandlingAction',
            message: t('prompts.tileHandlingAction'),
            choices: [
                { name: t('prompts.choices.replaceOriginalTile'), value: tileActions.REPLACE },
                { name: t('prompts.choices.addNewTile'), value: tileActions.ADD }
            ],
            store: false,
            guiOptions: {
                mandatory: true
            }
        } as ListQuestion<TileActionAnswers>,
        {
            type: 'confirm',
            name: 'copyFromExisting',
            message: t('prompts.copyFromExisting'),
            default: false,
            when: (answers: any): boolean => answers.tileHandlingAction === tileActions.ADD
        } as ConfirmQuestion<TileActionAnswers>
    ];
}