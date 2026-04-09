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

jest.unstable_mockModule('prompts', () => ({
    prompt: jest.fn(),
    inject: jest.fn()
}));

const prompt = await import('../../../src/prompt');

test('Smoke test', () => {
    expect(prompt).toBeDefined();
    expect(prompt.getSmartLinksTargetFromPrompt).toBeDefined();
    expect(prompt.promptUserPass).toBeDefined();
});
