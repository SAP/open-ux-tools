import type { ListQuestion, ConfirmQuestion, YUIQuestion } from '@sap-ux/inquirer-common';
import type { ManifestNamespace } from '@sap-ux/project-access';
import { Severity, type IMessageSeverity } from '@sap-devx/yeoman-ui-types';
import { type TileSettingsAnswers, tileActions, tilePromptNames } from '../../types';
import { t } from '../../i18n';

function getReplaceScenarioMessage(inbounds: ManifestNamespace.Inbound): string {
    let message = `Selecting this option will replace ALL existing tiles from the base application. 
           The following base application tile(s) will be affected: `;
    Object.keys(inbounds).forEach((key) => {
        message += `${key} - ${inbounds[key].title}; `;
    });
    return message;
}

function getReplaceScenarioAdditionalMessage(inbounds: ManifestNamespace.Inbound): IMessageSeverity | undefined {
    return {
        severity: Severity.information,
        message: getReplaceScenarioMessage(inbounds)
    };
}

/**
 * Returns the list of questions for tile handling actions.
 *
 * @param inbounds - list of tile inbounds of the application.
 * @returns {YUIQuestion<TileSettingsAnswers>[]} Array of tile action questions.
 */
export function getTileSettingsPrompts(inbounds: ManifestNamespace.Inbound): YUIQuestion<TileSettingsAnswers>[] {
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
            additionalMessages: (answer: TileSettingsAnswers['tileHandlingAction']): IMessageSeverity | undefined => {
                let additionalMessage: IMessageSeverity | undefined;
                if (answer === tileActions.REPLACE) {
                    additionalMessage = getReplaceScenarioAdditionalMessage(inbounds);
                }
                return additionalMessage;
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
        } as ConfirmQuestion<TileSettingsAnswers>,
        {
            type: 'confirm',
            name: 'ConfirmReplaceAllTiles',
            message: getReplaceScenarioMessage(inbounds),
            default: false,
            guiOptions: {
                mandatory: true,
                breadcrumb: true
            },
            validate: (answer: boolean): boolean => answer,
            when: (answers: any): boolean => answers.tileHandlingAction === tileActions.REPLACE
        } as ConfirmQuestion<TileSettingsAnswers>
    ];
}
