import type { ListQuestion, ConfirmQuestion, YUIQuestion } from '@sap-ux/inquirer-common';
import { type TileSettingsAnswers, tileActions, tilePromptNames } from '../../types';
import { t } from '../../i18n';

/**
 * Returns the list of questions for tile handling actions.
 *
 * @returns {YUIQuestion<TileSettingsAnswers>[]} Array of tile action questions.
 */
export function getTileSettingsPrompts(): YUIQuestion<TileSettingsAnswers>[] {
    return [
        {
            type: 'list',
            name: tilePromptNames.tileHandlingAction,
            message: t('prompts.tileHandlingAction'),
            choices: [
                { name: t('choices.replaceOriginalTile'), value: tileActions.REPLACE },
                { name: t('choices.addNewTile'), value: tileActions.ADD }
            ],
            store: false,
            guiOptions: {
                mandatory: true,
                breadcrumb: true
            }
        } as ListQuestion<TileSettingsAnswers>,
        {
            type: 'confirm',
            name: tilePromptNames.copyFromExisting,
            message: t('prompts.copyFromExisting'),
            default: false,
            guiOptions: {
                mandatory: true,
                breadcrumb: true
            },
            when: (answers: any): boolean => answers.tileHandlingAction === tileActions.ADD
        } as ConfirmQuestion<TileSettingsAnswers>
    ];
}
