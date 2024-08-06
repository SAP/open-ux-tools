import { getAnswer } from '../../../src/prompts/utils';

describe('Prompts', () => {
    describe('getAnswer', () => {
        const originalObject = {
            test: {
                dummy1: {
                    dummy1_2: 1
                },
                dummy2: 2
            },
            test2: 3
        };
        const testObject = JSON.parse(JSON.stringify(originalObject));
        const testCases = [
            {
                name: 'Read value on deep level - value exists',
                path: 'test.dummy1.dummy1_2',
                expectedValue: 1
            },
            {
                name: 'Read value on first level - value exists',
                path: 'test2',
                expectedValue: 3
            },
            {
                name: 'Read value on deep level - path does not exist',
                path: 'test404.dummy1.dummy1_2',
                expectedValue: undefined
            },
            {
                name: 'Read value on first level - path does not exist',
                path: 'test404',
                expectedValue: undefined
            }
        ];
        test.each(testCases)('$name', async ({ path, expectedValue }) => {
            expect(getAnswer(testObject, path)).toEqual(expectedValue);
            // Avoid mutation
            expect(testObject).toStrictEqual(originalObject);
        });
    });
});
