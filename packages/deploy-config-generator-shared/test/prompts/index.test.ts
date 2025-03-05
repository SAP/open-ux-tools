import { getConfirmMtaContinuePrompt } from '../../src/prompts';
import { initI18n } from '../../src/utils/i18n';

describe('prompts', () => {
    beforeAll(async () => {
        await initI18n();
    });

    test('should returncap mta continue confirm prompt', () => {
        const result = getConfirmMtaContinuePrompt();
        expect(result).toEqual([
            {
                type: 'confirm',
                name: 'addCapMtaContinue',
                message:
                    'There is no `mta.yaml` file defined for this project. To add a deployment configuration for this application, this file must be present. Do you want to create an `mta.yaml` file to continue?',
                default: false
            }
        ]);
    });
});
