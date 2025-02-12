import { getConfirmConfigUpdatePrompt } from '../../src/prompts';
import { initI18n } from '../../src/utils/i18n';

describe('prompts', () => {
    beforeAll(async () => {
        await initI18n();
    });

    test('should return config update confirm prompt', () => {
        const configType = 'TEST';
        const result = getConfirmConfigUpdatePrompt(configType);
        expect(result).toEqual([
            {
                type: 'confirm',
                name: 'confirmConfigUpate',
                message: `${configType} configuration is managed centrally as part of the CI pipeline, local updates to the configuration will not be for productive use. Are you sure you want to continue?`,
                default: false
            }
        ]);
    });
});
