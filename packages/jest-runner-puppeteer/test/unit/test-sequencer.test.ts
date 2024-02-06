import CustomSequencer from '../../src/test-sequencer';
import type { Test } from 'jest-runner';

describe('CustomSequencer', () => {
    const test1 = { path: '/path/to/v2-ovp.spec.ts' } as unknown as Test;
    const test2 = { path: '/path/to/v2-steampunk.spec.ts' } as unknown as Test;
    const test3 = { path: '/path/to/v2-abap.spec.ts' } as unknown as Test;
    const test4 = { path: '/path/to/v4-cap.spec.ts' } as unknown as Test;
    const test5 = { path: '/path/to/unknown.spec.ts' } as unknown as Test;

    const sequencer = new CustomSequencer();

    it('should sort tests based on custom order', () => {
        const sortedTests = sequencer.sort([test1, test2, test3, test4]);
        expect(sortedTests).toEqual([test1, test2, test3, test4]);
    });

    it('should handle tests with names not present in the order object', () => {
        const sortedTests = sequencer.sort([test1, test5]);
        expect(sortedTests).toEqual([test1, test5]);
    });

    it('should handle tests with the same custom order', () => {
        const test1Duplicate = { path: '/path/to/v2-ovp-duplicate.spec.ts' } as unknown as Test;
        const sortedTests = sequencer.sort([test1, test1Duplicate]);
        expect(sortedTests).toEqual([test1, test1Duplicate]);
    });

    it('should handle empty array of tests', () => {
        const sortedTests = sequencer.sort([]);
        expect(sortedTests).toEqual([]);
    });
});
