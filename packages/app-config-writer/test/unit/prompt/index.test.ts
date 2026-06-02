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

const mockPrompt = jest.fn();
const mockPromptsModule = Object.assign(mockPrompt, { prompt: mockPrompt, inject: jest.fn() });
jest.unstable_mockModule('prompts', () => ({
    default: mockPromptsModule
}));

const prompt = await import('../../../src/prompt/index.js');

test('Smoke test', () => {
    expect(prompt).toBeDefined();
    expect(prompt.getSmartLinksTargetFromPrompt).toBeDefined();
    expect(prompt.promptUserPass).toBeDefined();
});
