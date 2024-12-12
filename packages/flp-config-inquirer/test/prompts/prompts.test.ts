import { getHostEnvironment, hostEnvironment } from '@sap-ux/fiori-generator-shared';

import { getQuestions } from '../../src/prompts';

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
