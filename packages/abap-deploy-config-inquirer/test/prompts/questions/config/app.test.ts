import { initI18n, t } from '../../../../src/i18n';
import { getAppConfigPrompts } from '../../../../src/prompts/questions';
import * as conditions from '../../../../src/prompts/conditions';
import * as validators from '../../../../src/prompts/validators';
import { promptNames, TransportConfig } from '../../../../src/types';
import { PromptState } from '../../../../src/prompts/prompt-state';

describe('getConfirmPrompts', () => {
    beforeAll(async () => {
        await initI18n();
    });
    it('should return expected prompts', () => {
        const prompts = getAppConfigPrompts({});
        expect(prompts).toMatchInlineSnapshot(`
            Array [
              Object {
                "default": [Function],
                "filter": [Function],
                "guiOptions": Object {
                  "breadcrumb": "SAPUI5 ABAP Repository",
                  "hint": "Enter the name for the deployed application. The name must follow the rules of creating a BSP application. It must not exceed 15 characters and must consist of alphanumeric characters or underscores only. Name should be unique in the BSP repository and its namespace is compatible with the selected package.",
                  "mandatory": true,
                },
                "message": [Function],
                "name": "ui5AbapRepo",
                "type": "input",
                "validate": [Function],
                "when": [Function],
              },
              Object {
                "default": [Function],
                "filter": [Function],
                "guiOptions": Object {
                  "breadcrumb": true,
                  "hint": "The description of the deployed application.",
                },
                "message": "Deployment Description",
                "name": "description",
                "type": "input",
                "validate": [Function],
                "when": [Function],
              },
            ]
        `);
    });

    test('should return expected values from ui5 abap repo prompt methods', async () => {
        jest.spyOn(conditions, 'showUi5AppDeployConfigQuestion').mockReturnValueOnce(true);
        jest.spyOn(validators, 'validateUi5AbapRepoName').mockReturnValueOnce(true);

        PromptState.transportAnswers = {
            transportConfig: {
                getApplicationPrefix: jest.fn().mockReturnValue('Z')
            } as unknown as TransportConfig
        };
        const appConfigPrompts = getAppConfigPrompts({});
        const ui5AbapRepoPrompt = appConfigPrompts.find((prompt) => prompt.name === promptNames.ui5AbapRepo);

        if (ui5AbapRepoPrompt) {
            expect((ui5AbapRepoPrompt.when as Function)()).toBe(true);
            expect((ui5AbapRepoPrompt.message as Function)()).toBe(
                t('prompts.config.app.ui5AbapRepo.messageMaxLength', {
                    applicationPrefix: 'Z'
                })
            );
            PromptState.resetTransportAnswers();
            expect((ui5AbapRepoPrompt.message as Function)()).toBe(t('prompts.config.app.ui5AbapRepo.message'));
            expect((ui5AbapRepoPrompt.default as Function)({ ui5AbapRepo: 'ZTEST' })).toBe('ZTEST');
            expect((ui5AbapRepoPrompt.validate as Function)()).toBe(true);

            PromptState.isYUI = false;
            expect((ui5AbapRepoPrompt.filter as Function)('test')).toBe('TEST');
            PromptState.isYUI = true;
            expect((ui5AbapRepoPrompt.filter as Function)('test  ')).toBe('test');
        }
    });

    test('should return expected values from overwrite prompt methods', async () => {
        jest.spyOn(conditions, 'showUi5AppDeployConfigQuestion').mockReturnValue(true);
        jest.spyOn(validators, 'validateAppDescription').mockReturnValue(true);

        const appConfigPrompts = getAppConfigPrompts({ description: { default: 'Mock description' } });
        const descriptionPrompt = appConfigPrompts.find((prompt) => prompt.name === promptNames.description);

        if (descriptionPrompt) {
            expect((descriptionPrompt.when as Function)()).toBe(true);
            expect(descriptionPrompt.message).toBe(t('prompts.config.app.description.message'));
            expect((descriptionPrompt.default as Function)({})).toBe('Mock description');
            expect((descriptionPrompt.filter as Function)('Mock description  ')).toBe('Mock description');
            expect((descriptionPrompt.validate as Function)()).toBe(true);
        }
    });
});
