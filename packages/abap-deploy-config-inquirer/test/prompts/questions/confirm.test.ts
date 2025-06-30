import { initI18n, t } from '../../../src/i18n';
import { getConfirmPrompts } from '../../../src/prompts/questions';
import * as conditions from '../../../src/prompts/conditions';
import * as validators from '../../../src/prompts/validators';
import { promptNames } from '../../../src/types';

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
                "name": "overwrite",
                "type": "confirm",
                "validate": [Function],
              },
            ]
        `);
    });

    test('should return expected values from index prompt methods', async () => {
        jest.spyOn(conditions, 'showIndexQuestion').mockReturnValueOnce(true);

        const confirmPrompts = getConfirmPrompts({});
        const indexPrompt = confirmPrompts.find((prompt) => prompt.name === promptNames.index);

        if (indexPrompt) {
            expect((indexPrompt.when as Function)()).toBe(true);
            expect(indexPrompt.message).toBe(t('prompts.confirm.index.message'));
            expect(indexPrompt.default).toBe(false);
        }
    });

    test('should return expected values from overwrite prompt methods', async () => {
        jest.spyOn(validators, 'validateConfirmQuestion').mockReturnValue(true);

        const confirmPrompts = getConfirmPrompts({});
        const overwritePrompt = confirmPrompts.find((prompt) => prompt.name === promptNames.overwrite);

        if (overwritePrompt) {
            expect(overwritePrompt.message).toBe(t('prompts.confirm.overwrite.message'));
            expect(overwritePrompt.default).toBe(true);
            expect((overwritePrompt.validate as Function)()).toBe(true);
        }
    });
});
