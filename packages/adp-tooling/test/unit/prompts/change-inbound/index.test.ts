import { getPrompts } from '../../../../src/prompts/change-inbound';
import * as i18n from '../../../../src/i18n';
import type { InboundChangeAnswers } from '../../../../src/types';

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

    test('test validation', () => {
        const prompts = getPrompts();
        const titlePrompt = prompts.find((p) => p.name === 'title');
        const titleValidation = titlePrompt?.validate?.('Some title', {
            subtitle: 'Some subtitle',
            icon: 'Some icon'
        } as unknown as InboundChangeAnswers);

        const subTitlePrompt = prompts.find((p) => p.name === 'subtitle');
        const subtitleValidation = subTitlePrompt?.validate?.('Some subtitle', {
            title: 'Some title',
            icon: 'Some icon'
        } as unknown as InboundChangeAnswers);

        const iconPrompt = prompts.find((p) => p.name === 'icon');
        const iconValidation = iconPrompt?.validate?.('Some icon', {
            subtitle: 'Some title',
            icon: 'Some icon'
        } as unknown as InboundChangeAnswers);

        expect(titleValidation).toBe(true);
        expect(subtitleValidation).toBe(true);
        expect(iconValidation).toBe(true);
    });
});
