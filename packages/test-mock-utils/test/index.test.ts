import { sortIntegers } from '../src/index';

describe('sortIntegers', () => {
    it('should sort an array of integers in ascending order', () => {
        const input = [5, 2, 9, 1, 7];
        const output = sortIntegers(input);
        expect(output).toEqual([1, 2, 5, 7, 9]);
    });
});
