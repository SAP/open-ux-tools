import { getFirstArgAsString, parseJsonInput } from '../../../src/utils/parse-json-arg';

describe('getFirstArgAsString', () => {
    it('should return the argument itself when passed as a string', () => {
        expect(getFirstArgAsString('arg')).toEqual('arg');
    });

    it('should return the first element in case of an array with arguments', () => {
        expect(getFirstArgAsString(['arg1', 'arg2'])).toEqual('arg1');
        expect(getFirstArgAsString([1, 2] as unknown as string[])).toEqual(1);
    });

    it('should return empty string if the arguments parameter is not in the expected format', () => {
        expect(getFirstArgAsString(null as unknown as string)).toEqual('');
        expect(getFirstArgAsString(undefined as unknown as string)).toEqual('');
        expect(getFirstArgAsString({} as unknown as string)).toEqual('');
    });
});

describe('parseJsonInput', () => {
    it('should return undefined if invalid json string is passed', () => {
        expect(parseJsonInput('invalid json')).toBeUndefined();
    });

    it('should return undefined in case the json values are not all of type string', () => {
        const json = { x: {}, y: 1, z: 'foo' };
        const jsonString = JSON.stringify(json);
        expect(parseJsonInput(jsonString)).toBeUndefined();
    });

    it('should return plain object when all keys and values are strings', () => {
        const json = { argA: 'argA', argB: 'argB' };
        const jsonString = JSON.stringify(json);
        expect(parseJsonInput(jsonString)).toEqual(json);
    });
});
