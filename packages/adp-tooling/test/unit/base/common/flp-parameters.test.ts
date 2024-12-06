import { type Parameter, parseParameters } from '../../../../src';

describe('parseParameters', () => {
    it('should parse parameters with default values', () => {
        const input = 'param1=value1&param2=value2';
        const expected: Parameter = {
            param1: { required: true, defaultValue: { value: 'value1', format: 'plain' } },
            param2: { required: true, defaultValue: { value: 'value2', format: 'plain' } }
        };

        expect(parseParameters(input)).toEqual(expected);
    });

    it('should parse parameters with filter values', () => {
        const input = 'param1=<value1>&param2=<value2>';
        const expected: Parameter = {
            param1: { required: true, filter: { value: 'value1', format: 'plain' } },
            param2: { required: true, filter: { value: 'value2', format: 'plain' } }
        };

        expect(parseParameters(input)).toEqual(expected);
    });

    it('should parse parameters with references', () => {
        const input = 'param1=%%value1%%&param2=%%value2%%';
        const expected: Parameter = {
            param1: { required: true, defaultValue: { value: 'value1', format: 'reference' } },
            param2: { required: true, defaultValue: { value: 'value2', format: 'reference' } }
        };

        expect(parseParameters(input)).toEqual(expected);
    });

    it('should parse parameters with renameTo', () => {
        const input = 'param1=>newParam1&param2=>newParam2';
        const expected: Parameter = {
            param1: { required: true, renameTo: 'newParam1' },
            param2: { required: true, renameTo: 'newParam2' }
        };

        expect(parseParameters(input)).toEqual(expected);
    });

    it('should parse parameters with optional parameters (parentheses)', () => {
        const input = '(param1=value1)&(param2=<value2>)';
        const expected: Parameter = {
            param1: { required: false, defaultValue: { value: 'value1', format: 'plain' } },
            param2: { required: false, filter: { value: 'value2', format: 'plain' } }
        };

        expect(parseParameters(input)).toEqual(expected);
    });

    it('should handle empty parameters', () => {
        const input = 'param1=&param2=';
        const expected: Parameter = {
            param1: expect.any(Object),
            param2: expect.any(Object)
        };

        expect(parseParameters(input)).toEqual(expected);
    });

    it('should throw an error for invalid parameter strings', () => {
        const input = 'param1&param2=value2';
        expect(() => parseParameters(input)).toThrow(SyntaxError);
    });

    it('should throw an error for duplicate parameters', () => {
        const input = 'param1=value1&param1=value2';
        expect(() => parseParameters(input)).toThrowError(/Duplicated parameter: 'param1'/);
    });

    it('should parse parameter with defaultValue and renameTo when paramParts.length === 3', () => {
        const input = 'param1=value1=>newParam1';
        const expected: Parameter = {
            param1: {
                required: true,
                defaultValue: { value: 'value1', format: 'plain' },
                renameTo: 'newParam1'
            }
        };

        expect(parseParameters(input)).toEqual(expected);
    });

    it('should add missing ampersands between optional parameters', () => {
        const input = '(param1=value1)(param2=value2)';
        const expected: Parameter = {
            param1: { required: false, defaultValue: { value: 'value1', format: 'plain' } },
            param2: { required: false, defaultValue: { value: 'value2', format: 'plain' } }
        };

        expect(parseParameters(input)).toEqual(expected);
    });
});
