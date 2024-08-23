import { isReservedProperty } from '../src/constants';

describe('isReservedProperty', () => {
    test.each([
        ['$value', true],
        ['$Type', true],
        ['$edmJson', true],
        ['$Value', false],
        ['value', false],
        ['edmJson', false],
        ['Type', false],
        ['$type', false],
        ['$EdmJson', false]
    ])('%s', (name, expected) => {
        expect(isReservedProperty(name)).toStrictEqual(expected);
    });
});
