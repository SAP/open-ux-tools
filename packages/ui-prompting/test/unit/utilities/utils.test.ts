import { getAnswer, setAnswer } from '../../../src/utilities/utils';

describe('utils', () => {
    describe('setAnswer', () => {
        test('Flat object', async () => {
            const result = setAnswer({}, 'test', 1);
            expect(result).toEqual({
                test: 1
            });
        });

        test('Nested path with empty object', async () => {
            const result = setAnswer({}, 'test.dummy.dummy2', 1);
            expect(result).toEqual({
                test: {
                    dummy: {
                        dummy2: 1
                    }
                }
            });
        });

        test('Nested path with fulfilled object - apply empty string', async () => {
            const result = setAnswer(
                {
                    test: {
                        dummy: 1
                    }
                },
                'test.dummy',
                ''
            );
            expect(result).toEqual({
                test: {
                    dummy: ''
                }
            });
        });

        test('Nested path with fulfilled object - apply simple value', async () => {
            const result = setAnswer(
                {
                    test: {
                        dummy: 1
                    }
                },
                'test.dummy',
                2
            );
            expect(result).toEqual({
                test: {
                    dummy: 2
                }
            });
        });

        test('Nested path with fulfilled object - overwrite object', async () => {
            const result = setAnswer(
                {
                    test: {
                        dummy: {
                            dummy2: 1
                        }
                    }
                },
                'test.dummy',
                1
            );
            expect(result).toEqual({
                test: {
                    dummy: 1
                }
            });
        });
    });

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
