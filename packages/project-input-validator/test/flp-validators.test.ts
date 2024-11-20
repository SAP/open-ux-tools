import { initI18nProjectValidators, t } from '../src/i18n';
import { validateText } from '../src/flp/validators';
import type { AllowedCharacters } from '../src/general/validators';

const allowedCharacters: AllowedCharacters[] = ['_'];
const inputName = 'Test Input';

describe('validators', () => {
    describe('validateText', () => {
        beforeAll(async () => {
            await initI18nProjectValidators();
        });

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should return an error if input is empty or only whitespace', () => {
            expect(validateText('')).toBe(
                t('general.inputCannotBeEmpty', {
                    inputName
                })
            );
            expect(validateText('   ')).toBe(
                t('general.inputCannotBeEmpty', {
                    inputName
                })
            );
        });

        it('should return an error if input exceeds the maximum length', () => {
            expect(validateText('12345678901', 10)).toBe(t('general.maxLength', { maxLength: 10 }));
        });

        it('should allow input if it is within the maximum length', () => {
            expect(validateText('12345', 10)).toBe(true);
        });

        it('should return an error if input contains unsupported characters', () => {
            expect(validateText('invalid!', 0, allowedCharacters)).toBe(
                t('general.supportedFormats', {
                    allowedCharacters: allowedCharacters.join('')
                })
            );
        });

        it('should allow input with allowed special characters', () => {
            expect(validateText('valid_input', 0, allowedCharacters)).toBe(true);
        });

        it('should allow input without allowed special characters', () => {
            expect(validateText('validInput123')).toBe(true);
        });

        it('should return true if input passes all validation checks', () => {
            expect(validateText('validInput_123*', 50)).toBe(true);
        });

        it('should handle undefined or null input gracefully', () => {
            expect(validateText(undefined as unknown as string)).toBe(
                t('general.inputCannotBeEmpty', {
                    inputName
                })
            );
            expect(validateText(null as unknown as string)).toBe(
                t('general.inputCannotBeEmpty', {
                    inputName
                })
            );
        });
    });
});
