import prompts from 'prompts';
import { promptConfirmation } from '../../../src/base/prompt';

describe('base/prompts', () => {
    const message = 'Test question?';

    describe('promptConfirmation', () => {
        test('Default answer.', async () => {
            prompts.inject([undefined]);
            expect(await promptConfirmation(message)).toBe(true);
        });

        test('Yes, or no.', async () => {
            prompts.inject([true]);
            expect(await promptConfirmation(message)).toBe(true);
            prompts.inject([false]);
            expect(await promptConfirmation(message)).toBe(false);
        });

        test('With callback.', async () => {
            const logSpy = jest.spyOn(global.console, 'log');
            const callback = () => {
                console.log('~Test');
            };
            prompts.inject([true]);
            expect(await promptConfirmation(message, callback)).toBe(true);
            expect(logSpy).toBeCalledTimes(1);
        });
    });
});
