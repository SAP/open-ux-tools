import { t } from '../src/i18n';
import { validateDestinationQuestion } from '../src/prompts/validators';

describe('validateInput', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns true for valid alphanumeric input within length limit', () => {
        expect(validateDestinationQuestion('valid_input-123')).toBe(true);
    });

    it('returns empty error message for empty input', () => {
        expect(validateDestinationQuestion('')).toBe(t('errors.emptyDestinationNameError'));
    });

    it('returns error for input with invalid characters', () => {
        expect(validateDestinationQuestion('invalid!@#')).toBe(t('errors.destinationNameError'));
    });

    it('returns error for input exceeding 200 characters', () => {
        const longInput = 'a'.repeat(201);
        expect(validateDestinationQuestion(longInput)).toBe(t('errors.destinationNameLengthError'));
    });
});

describe('validateDestinationQuestion', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns true if allowEmptyChoice is true', () => {
        expect(validateDestinationQuestion('', true)).toBe(true);
    });

    it('validates non-empty input when allowEmptyChoice is false', () => {
        expect(validateDestinationQuestion('valid_input-123', false)).toBe(true);
    });

    it('returns error if input is empty and allowEmptyChoice is false', () => {
        expect(validateDestinationQuestion('', false)).toBe(t('errors.emptyDestinationNameError'));
    });
});
