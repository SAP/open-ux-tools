import { initI18nProjectValidators, t } from '../src/i18n';
import type { AllowedCharacters } from '../src/flp/validators';
import { validateText } from '../src/flp/validators';

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
            console.log(
                t('flp.inputRequired', {
                    inputName
                })
            );
            expect(validateText('', inputName)).toBe(
                t('flp.inputRequired', {
                    inputName
                })
            );
            expect(validateText('   ', inputName)).toBe(
                t('flp.inputRequired', {
                    inputName
                })
            );
        });

        it('should return an error if input exceeds the maximum length', () => {
            expect(validateText('12345678901', inputName, 10)).toBe(t('flp.maxLength', { maxLength: 10 }));
        });

        it('should allow input if it is within the maximum length', () => {
            expect(validateText('12345', inputName, 10)).toBe(true);
        });

        it('should return an error if input contains unsupported characters', () => {
            expect(validateText('invalid!', inputName, 0, allowedCharacters)).toBe(
                t('flp.supportedFormats', {
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
                t('flp.inputRequired', {
                    inputName
                })
            );
            expect(validateText(null as unknown as string, inputName)).toBe(
                t('flp.inputRequired', {
                    inputName
                })
            );
        });
    });
});
