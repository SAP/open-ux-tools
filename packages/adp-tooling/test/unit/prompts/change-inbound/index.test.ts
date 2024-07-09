import { getPrompts } from '../../../../src/prompts/change-inbound';
import * as i18n from '../../../../src/i18n';

describe('getPrompts', () => {
    beforeAll(async () => {
        await i18n.initI18n();
    });

    test('returns prompts', () => {
        const prompts = getPrompts();
        expect(prompts).toEqual([
            {
                type: 'input',
                name: 'title',
                message: i18n.t('prompts.title'),
                guiOptions: {
                    hint: i18n.t('tooltips.title')
                },
                validate: expect.any(Function),
                store: false
            },
            {
                type: 'input',
                name: 'subtitle',
                message: i18n.t('prompts.subtitle'),
                guiOptions: {
                    hint: i18n.t('tooltips.subtitle')
                },
                validate: expect.any(Function),
                store: false
            },
            {
                type: 'input',
                name: 'icon',
                message: i18n.t('prompts.icon'),
                guiOptions: {
                    hint: i18n.t('tooltips.icon')
                },
                store: false,
                validate: expect.any(Function)
            }
        ]);
    });
});
