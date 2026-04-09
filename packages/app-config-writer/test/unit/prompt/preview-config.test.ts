import { jest } from '@jest/globals';
import chalk from 'chalk';

jest.unstable_mockModule('chalk', () => ({
    default: chalk,
    cyan: (s: string) => s,
    yellow: (s: string) => s,
    red: (s: string) => s,
    green: (s: string) => s,
    blue: (s: string) => s,
    bold: (s: string) => s,
    dim: (s: string) => s
}));

let promptReturnObject: object;
jest.unstable_mockModule('prompts', () => {
    return {
        prompt: () => {
            return promptReturnObject;
        }
    };
});

const { includeTestRunnersPrompt, simulatePrompt } = await import('../../../src');

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
        await expect(simulatePrompt()).rejects.toThrow();
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
        await expect(includeTestRunnersPrompt()).rejects.toThrow();
    });
});
