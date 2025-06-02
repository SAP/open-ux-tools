import type { ListQuestion, ConfirmQuestion, YUIQuestion } from '@sap-ux/inquirer-common';
import { type TileSettingsAnswers, tileActions } from '../../types';
import { t } from '../../i18n';

/**
 * Returns the list of questions for tile handling actions.
 *
 * @returns {YUIQuestion<TileActionAnswers>[]} Array of tile action questions.
 */
export function getPrompts(): YUIQuestion<TileSettingsAnswers>[] {
    return [
        {
            type: 'list',
            name: 'tileHandlingAction',
            message: t('prompts.tileHandlingAction'),
            choices: [
                { name: t('choices.tileActions.replaceOriginalTile'), value: tileActions.REPLACE },
                { name: t('choices.tileActions.addNewTile'), value: tileActions.ADD }
            ],
            store: false,
            guiOptions: {
                mandatory: true
            }
        } as ListQuestion<TileSettingsAnswers>,
        {
            type: 'confirm',
            name: 'copyFromExisting',
            message: t('prompts.copyFromExisting'),
            default: false,
            when: (answers: any): boolean => answers.tileHandlingAction === tileActions.ADD
        } as ConfirmQuestion<TileSettingsAnswers>
    ];
}
