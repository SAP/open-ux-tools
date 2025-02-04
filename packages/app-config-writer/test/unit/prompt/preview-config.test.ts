import { includeTestRunnersPrompt, simulatePrompt } from '../../../src';

let promptReturnObject: object;
jest.mock('prompts', () => {
    return {
        prompt: () => {
            return promptReturnObject;
        }
    };
});

describe('Test prompts for convert preview', () => {
    test('Test simulatePrompt - true', async () => {
        promptReturnObject = { simulate: true };
        expect(await simulatePrompt()).toBeTruthy();
    });

    test('Test simulatePrompt - false', async () => {
        promptReturnObject = { simulate: false };
        expect(await simulatePrompt()).toBeFalsy();
    });

    test('Test simulatePrompt - cancel', async () => {
        promptReturnObject = { undefined };
        await expect(simulatePrompt()).rejects.toThrowError();
    });

    test('Test includeTestRunnersPrompt - true', async () => {
        promptReturnObject = { includeTests: true };
        expect(await includeTestRunnersPrompt()).toBeTruthy();
    });

    test('Test includeTestRunnersPrompt - false', async () => {
        promptReturnObject = { includeTests: false };
        expect(await includeTestRunnersPrompt()).toBeFalsy();
    });

    test('Test includeTestRunnersPrompt - cancel', async () => {
        promptReturnObject = { undefined };
        await expect(includeTestRunnersPrompt()).rejects.toThrowError();
    });
});
