import { getApiHubOptions } from '../../../../deploy-config-sub-generator/src/utils';
import { getTileSettingsPrompts } from '../../../src/prompts/questions/tile-settings';
import { tileActions, tilePromptNames, type TileSettingsAnswers } from '../../../src/types';
import type { ListQuestion } from '@sap-ux/inquirer-common';

describe('getTileSettingsPrompts', () => {
    it('should return two prompts', () => {
        const prompts = getTileSettingsPrompts();
        expect(prompts).toHaveLength(2);
    });

    it('should return a list question for tileHandlingAction', () => {
        const prompts = getTileSettingsPrompts();
        const tileActionsPrompt = prompts[0] as ListQuestion<TileSettingsAnswers>;

        expect(tileActionsPrompt).toEqual(
            expect.objectContaining({
                type: 'list',
                name: tilePromptNames.tileHandlingAction,
                message: 'prompts.tileHandlingAction',
                guiOptions: {
                    mandatory: true,
                    breadcrumb: true
                },
                choices: [
                    { name: 'choices.addNewTile', value: tileActions.ADD },
                    { name: 'choices.replaceOriginalTile', value: tileActions.REPLACE }
                ],
                store: false
            })
        );
    });

    it('should return a confirm question for copyFromExisting', () => {
        const prompts = getTileSettingsPrompts();
        const confirmPrompt = prompts[1];

        expect(confirmPrompt).toEqual(
            expect.objectContaining({
                type: 'confirm',
                name: tilePromptNames.copyFromExisting,
                message: 'prompts.copyFromExisting',
                guiOptions: {
                    mandatory: true,
                    breadcrumb: true
                },
                default: false,
                when: expect.any(Function)
            })
        );
    });

    it('should show copyFromExisting only when tileHandlingAction is ADD', () => {
        const prompts = getTileSettingsPrompts();
        const copyFromExistingPrompt = prompts[1];

        expect((copyFromExistingPrompt.when as Function)({ tileHandlingAction: tileActions.ADD })).toBe(true);
        expect((copyFromExistingPrompt.when as Function)({ tileHandlingAction: tileActions.REPLACE })).toBe(false);
    });
});
