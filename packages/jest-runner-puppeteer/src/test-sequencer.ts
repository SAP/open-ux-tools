import Sequencer from '@jest/test-sequencer';
import type { Test } from 'jest-runner';
import path from 'path';

const order = { 'v2-ovp': 1, 'v2-steampunk': 2, 'v2-abap': 3, 'v4-cap': 4, default: 1000 };

/**
 * Extracts the test name from the test path.
 *
 * @param test the test object
 * @returns the extracted test name
 */
const testName = (test: Test): string => path.parse(test.path).base.replace('.spec.ts', '');

/**
 * Custom test sequencer that sorts tests based on the predefined order.
 */
export default class CustomSequencer extends Sequencer {
    /**
     * Sorts the tests based on the predefined order.
     *
     * @param tests the array of tests to sort
     * @returns the sorted array of tests
     */
    sort(tests: Test[]): Test[] {
        return Array.from(tests).sort(
            (testA, testB) => (order[testName(testA)] || order.default) - (order[testName(testB)] || order.default)
        );
    }
}
