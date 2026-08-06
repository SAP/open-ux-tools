import { jest } from '@jest/globals';
import { promptNames } from '../../../src/types.js';

const mockShowIndexQuestion = jest.fn<typeof actualConditions.showIndexQuestion>();
const mockValidateConfirmQuestion = jest.fn<typeof actualValidators.validateConfirmQuestion>();

const actualConditions = await import('../../../src/prompts/conditions.js');
const actualValidators = await import('../../../src/prompts/validators.js');

jest.unstable_mockModule('../../../src/prompts/conditions', () => ({
    ...actualConditions,
    showIndexQuestion: mockShowIndexQuestion
}));

jest.unstable_mockModule('../../../src/prompts/validators', () => ({
    ...actualValidators,
    validateConfirmQuestion: mockValidateConfirmQuestion
}));

const { initI18n, t } = await import('../../../src/i18n.js');
const { getConfirmPrompts } = await import('../../../src/prompts/questions/confirm.js');

describe('getConfirmPrompts', () => {
    beforeAll(async () => {
        await initI18n();
    });
    it('should return expected prompts', () => {
        const prompts = getConfirmPrompts({});
        expect(prompts).toMatchInlineSnapshot(`
            Array [
              Object {
                "default": false,
                "guiOptions": Object {
                  "breadcrumb": "prompts.confirm.index.hint",
                },
                "message": "Generate Standalone index.html During Deployment",
                "name": "index",
                "type": "confirm",
                "when": [Function],
              },
              Object {
                "default": true,
                "guiOptions": Object {
                  "hint": "Deployment config will abort if you choose no. Click 'Finish' to abort.",
                },
                "message": "Editing the deployment configuration will overwrite the existing configuration. Are you sure you want to continue?",
                "name": "overwriteAbapConfig",
                "type": "confirm",
                "validate": [Function],
              },
            ]
        `);
    });

    test('should return expected values from index prompt methods', async () => {
        mockShowIndexQuestion.mockReturnValueOnce(true);

        const confirmPrompts = getConfirmPrompts({});
        const indexPrompt = confirmPrompts.find((prompt) => prompt.name === promptNames.index);

        if (indexPrompt) {
            expect((indexPrompt.when as Function)()).toBe(true);
            expect(indexPrompt.message).toBe(t('prompts.confirm.index.message'));
            expect(indexPrompt.default).toBe(false);
        }
    });

    test('should return expected values from overwrite prompt methods', async () => {
        mockValidateConfirmQuestion.mockReturnValue(true);

        const confirmPrompts = getConfirmPrompts({});
        const overwritePrompt = confirmPrompts.find((prompt) => prompt.name === promptNames.overwriteAbapConfig);

        if (overwritePrompt) {
            expect(overwritePrompt.message).toBe(t('prompts.confirm.overwrite.message'));
            expect(overwritePrompt.default).toBe(true);
            expect((overwritePrompt.validate as Function)()).toBe(true);
        }
    });
});
