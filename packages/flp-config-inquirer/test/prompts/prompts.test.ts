import { getQuestions } from '../../src/prompts';
import { PLATFORMS, getPlatform } from '../../src/prompts/utils';

jest.mock('../../src/prompts/utils.ts', () => ({
    ...jest.requireActual('../../src/prompts/utils.ts'),
    getPlatform: jest.fn()
}));

const mockGetPlatform = getPlatform as jest.MockedFunction<typeof getPlatform>;

describe('getQuestions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return questions array with correct prompts', () => {
        mockGetPlatform.mockReturnValue(PLATFORMS.CLI);

        const questions = getQuestions([]);

        expect(mockGetPlatform).toHaveBeenCalled();
        expect(questions.length).toBe(5);
    });
});
