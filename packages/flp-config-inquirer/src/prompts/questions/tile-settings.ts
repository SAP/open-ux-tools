import type { ListQuestion, ConfirmQuestion, YUIQuestion } from '@sap-ux/inquirer-common';
import { Severity, type IMessageSeverity } from '@sap-devx/yeoman-ui-types';
import type { ManifestNamespace } from '@sap-ux/project-access';
import { type TileSettingsAnswers, tileActions, tilePromptNames, type OnActionSelect } from '../../types';
import { t } from '../../i18n';

/**
 * Returns the list of questions for tile handling actions.
 *
 * @param inbounds - list of tile inbounds of the application.
 * @param onActionSelect - callback function to handle changes in tile settings.
 * @returns {YUIQuestion<TileSettingsAnswers>[]} Array of tile action questions.
 */
export function getTileSettingsPrompts(
    inbounds: ManifestNamespace.Inbound,
    onActionSelect?: OnActionSelect
): YUIQuestion<TileSettingsAnswers>[] {
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
            },
            additionalMessages: async (
                answer: TileSettingsAnswers['tileHandlingAction']
            ): Promise<IMessageSeverity | undefined> => {
                let additionalMessage: IMessageSeverity | undefined;
                if (answer === tileActions.REPLACE) {
                    additionalMessage = {
                        severity: Severity.information,
                        message: t('additionalMessages.replaceScenarioInfo')
                    };
                }
                return additionalMessage;
            },
            validate: async (answer: TileSettingsAnswers['tileHandlingAction']): Promise<boolean | string> => {
                let handlerResult: boolean | string | undefined = true;
                if (typeof onActionSelect === 'function') {
                    handlerResult = await onActionSelect(answer);
                }
                return handlerResult ?? true;
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
