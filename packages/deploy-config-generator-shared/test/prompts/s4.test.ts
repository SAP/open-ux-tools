import { getS4ContinuePrompt } from '../../src/prompts/s4';
import { initI18n } from '../../src/utils/i18n';

describe('s4 prompt', () => {
    beforeAll(async () => {
        await initI18n();
    });

    test('should return s4 continue prompt', () => {
        const configType = 'TEST';
        const result = getS4ContinuePrompt(configType);
        expect(result).toEqual([
            {
                type: 'confirm',
                name: 's4Continue',
                message: `S/4 ${configType} configuration is managed centrally as part of the CI pipeline, local updates to deployment configuration will not be for productive use. Are you sure you want to continue?`,
                default: false
            }
        ]);
    });
});
