import { t } from '../src/i18n';
import { validateDestinationQuestion } from '../src/prompts/validators';

describe('validateDestinationQuestion', () => {
    beforeEach(async () => {
        jest.clearAllMocks();
    });

    const cfServiceInput: [any, any][] = [
        [' ', t('errors.emptyDestinationNameError')],
        ['', t('errors.emptyDestinationNameError')],
        ['ABC ', t('errors.destinationNameError')],
        ['ABC&', t('errors.destinationNameError')],
        ['ABC$', t('errors.destinationNameError')],
        ['ABC abc', t('errors.destinationNameError')],
        ['a'.repeat(201), t('errors.destinationNameLengthError')],
        ['ABCabc', true],
        ['123ABCabc', true],
        ['123ABCabc123', true],
        ['_ABCabc123', true],
        ['-ABCabc123', true],
        ['ABC', true],
        ['ABC-abc', true],
        ['ABC_abc', true],
        [{}, true]
    ];

    test.each(cfServiceInput)('Validate destination field %p', (input, toEqual) => {
        const output = validateDestinationQuestion(input, false);
        expect(output).toEqual(toEqual);
    });

    it('returns true if allowEmptyChoice is true', () => {
        expect(validateDestinationQuestion('', true)).toBe(true);
    });
});
