import { getHostEnvironment, hostEnvironment } from '@sap-ux/fiori-generator-shared';

import { getQuestions, getTileSettingsQuestions } from '../../src/prompts';

jest.mock('@sap-ux/fiori-generator-shared', () => ({
    ...jest.requireActual('@sap-ux/fiori-generator-shared'),
    getHostEnvironment: jest.fn()
}));

const mockGetHostEnv = getHostEnvironment as jest.MockedFunction<typeof getHostEnvironment>;

describe('getQuestions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return questions array with correct prompts', () => {
        mockGetHostEnv.mockReturnValue(hostEnvironment.cli);

        const questions = getQuestions({ 'new-upsert': { semanticObject: '', action: '' } });

        expect(mockGetHostEnv).toHaveBeenCalled();
        expect(questions.length).toBe(9);
    });

    it('should return questions array with correct prompts when no arguments are passed', () => {
        mockGetHostEnv.mockReturnValue(hostEnvironment.bas);

        const questions = getQuestions();

        expect(mockGetHostEnv).toHaveBeenCalled();
        expect(questions.length).toBe(9);
    });
});

describe('getTileSettingsQuestions', () => {
    it('should return tile settings prompts', () => {
        mockGetHostEnv.mockReturnValue(hostEnvironment.vscode);
        const tileSettingsPrompts = getTileSettingsQuestions();

        expect(tileSettingsPrompts.length).toBe(3);
        expect(tileSettingsPrompts[0].name).toBe('existingFlpConfigInfo');
        expect(tileSettingsPrompts[1].name).toBe('tileHandlingAction');
        expect(tileSettingsPrompts[2].name).toBe('copyFromExisting');
    });

    it('should not return existingFlpConfigInfo prompt when requested via options', () => {
        mockGetHostEnv.mockReturnValue(hostEnvironment.cli);
        const tileSettingsPrompts = getTileSettingsQuestions({
            existingFlpConfigInfo: { hide: true }
        });

        expect(tileSettingsPrompts.length).toBe(2);
        expect(tileSettingsPrompts[0].name).toBe('tileHandlingAction');
        expect(tileSettingsPrompts[1].name).toBe('copyFromExisting');
    });
});
