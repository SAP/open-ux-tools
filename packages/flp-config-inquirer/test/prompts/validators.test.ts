import { initI18n, t } from '../../src/i18n';
import { validateText } from '../../src/prompts/validators';
import { AllowedCharacters } from '../../src/types';

const allowedCharacters: AllowedCharacters[] = ['_'];
const inputName = 'Test Input';

describe('validators', () => {
    describe('validateText', () => {
        beforeAll(async () => {
            await initI18n();
        });

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should return an error if input is empty or only whitespace', () => {
            expect(validateText('', inputName)).toBe(
                t('validators.inputRequired', {
                    inputName
                })
            );
            expect(validateText('   ', inputName)).toBe(
                t('validators.inputRequired', {
                    inputName
                })
            );
        });

        it('should return an error if input exceeds the maximum length', () => {
            expect(validateText('12345678901', inputName, 10)).toBe(t('validators.maxLength', { maxLength: 10 }));
        });

        it('should allow input if it is within the maximum length', () => {
            expect(validateText('12345', inputName, 10)).toBe(true);
        });

        it('should return an error if input contains unsupported characters', () => {
            expect(validateText('invalid!', inputName, 0, allowedCharacters)).toBe(
                t('validators.supportedFormats', {
                    allowedCharacters: allowedCharacters.join('')
                })
            );
        });

        it('should allow input with allowed special characters', () => {
            expect(validateText('valid_input', inputName, 0, allowedCharacters)).toBe(true);
        });

        it('should allow input without allowed special characters', () => {
            expect(validateText('validInput123', inputName)).toBe(true);
        });

        it('should return true if input passes all validation checks', () => {
            expect(validateText('validInput_123*', inputName, 50)).toBe(true);
        });

        it('should handle undefined or null input gracefully', () => {
            expect(validateText(undefined as unknown as string, inputName)).toBe(
                t('validators.inputRequired', {
                    inputName
                })
            );
            expect(validateText(null as unknown as string, inputName)).toBe(
                t('validators.inputRequired', {
                    inputName
                })
            );
        });
    });
});
