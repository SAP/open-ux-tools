import { initI18n, t } from '../../../src/i18n';
import { promptNames } from '../../../src/types';
import { getSemanticObjectPrompt } from '../../../src/prompts/questions';
import { validateText } from '../../../src/prompts/validators';

jest.mock('../../../src/prompts/validators.ts', () => ({
    ...jest.requireActual('../../../src/prompts/validators.ts'),
    validateText: jest.fn()
}));

describe('basic prompts', () => {
    beforeAll(async () => {
        await initI18n();
    });

    describe('getSemanticObjectPrompt', () => {
        const mockValidateText = validateText as jest.Mock;

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should create a prompt with the correct default properties', () => {
            const options = { default: 'DefaultSemanticObject' };
            const prompt = getSemanticObjectPrompt(options);

            expect(prompt).toEqual({
                name: promptNames.semanticObject,
                type: 'input',
                guiOptions: {
                    mandatory: true,
                    breadcrumb: true
                },
                message: t('prompts.semanticObject'),
                default: 'DefaultSemanticObject',
                filter: expect.any(Function),
                validate: expect.any(Function)
            });
        });

        it('should set default to undefined if no options are provided', () => {
            const prompt = getSemanticObjectPrompt();

            expect(prompt.default).toBeUndefined();
        });

        it('should trim the input value in the filter function', () => {
            const prompt = getSemanticObjectPrompt();
            const filterFn = prompt.filter as (val: string) => string;

            expect(filterFn('   trimmedValue   ')).toBe('trimmedValue');
            expect(filterFn('')).toBe('');
        });

        it('should validate the input value using validateText', () => {
            mockValidateText.mockReturnValue(true);

            const prompt = getSemanticObjectPrompt();
            const validateFn = prompt.validate as (val: string) => boolean;

            const result = validateFn('testValue');

            expect(mockValidateText).toHaveBeenCalledWith('testValue', t('prompts.semanticObject'), 30, ['_']);
            expect(result).toBe(true);
        });

        it('should fail validation if validateText returns false', () => {
            mockValidateText.mockReturnValue(false);

            const prompt = getSemanticObjectPrompt();
            const validateFn = prompt.validate as (val: string) => boolean;

            const result = validateFn('invalidValue');

            expect(mockValidateText).toHaveBeenCalledWith('invalidValue', t('prompts.semanticObject'), 30, ['_']);
            expect(result).toBe(false);
        });
    });
});
