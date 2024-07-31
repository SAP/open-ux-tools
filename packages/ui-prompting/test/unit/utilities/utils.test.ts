import { getAnswer, setAnswer, updateAnswers, isDeepEqual } from '../../../src/utilities/utils';
import type { Answers, PromptQuestion } from '../../../src/types';

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

        const testCases = [
            {
                name: 'Restriction at the end of path',
                path: 'test.prototype'
            },
            {
                name: 'Restriction in the middle of path',
                path: 'test.prototype.dummy'
            }
        ];
        test.each(testCases)('Restricted properties. $name', async ({ path }) => {
            const result = setAnswer(
                {
                    test: {
                        dummy: 1
                    }
                },
                path,
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

    describe('updateAnswers', () => {
        test('Update answers without dependants', async () => {
            const original = {
                test1: {
                    dummy1: 1
                },
                test2: {
                    dummy2: 2
                }
            };
            const result = updateAnswers(original, [], 'test2.dummy2', 'New');
            expect(result).toEqual({
                test1: {
                    dummy1: 1
                },
                test2: {
                    dummy2: 'New'
                }
            });
            expect(result.test1 !== original.test1).toBeTruthy();
        });

        const testCases: Array<{ name: string; type?: 'list'; expected: unknown }> = [
            {
                name: 'Type => list',
                type: 'list',
                expected: {
                    test1: {
                        dummy1: undefined
                    },
                    test2: {
                        dummy2: 'New'
                    }
                }
            },
            {
                name: 'Type -> unknown',
                type: undefined,
                expected: {
                    test1: {
                        dummy1: 1
                    },
                    test2: {
                        dummy2: 'New'
                    }
                }
            }
        ];
        test.each(testCases)('Update answers with dependants. $name', async ({ type, expected }) => {
            const original = {
                test1: {
                    dummy1: 1
                },
                test2: {
                    dummy2: 2
                }
            };
            const questions: PromptQuestion[] = [
                {
                    name: 'test1.dummy1'
                },
                {
                    name: 'test2.dummy2',
                    // Edge case to test with undefined
                    type: type as 'list',
                    guiOptions: {
                        dependantPromptNames: ['test1.dummy1']
                    }
                }
            ];
            const result = updateAnswers(original, questions, 'test2.dummy2', 'New');
            expect(result).toEqual(expected);
        });
    });

    describe('isDeepEqual', () => {
        const testCases: Array<{ name: string; obj1: Answers; obj2: Answers; expected: boolean }> = [
            {
                name: 'Empty objects',
                obj1: {},
                obj2: {},
                expected: true
            },
            {
                name: 'Matching objects',
                obj1: {
                    test1: {
                        key1: 'Default value',
                        key2: 'External value 1'
                    },
                    test2: {
                        key1: 'External value 2'
                    }
                },
                obj2: {
                    test1: {
                        key1: 'Default value',
                        key2: 'External value 1'
                    },
                    test2: {
                        key1: 'External value 2'
                    }
                },
                expected: true
            },
            {
                name: 'Property added',
                obj1: {
                    test1: {
                        key1: 'Default value',
                        key2: 'External value 1'
                    }
                },
                obj2: {
                    test1: {
                        key1: 'Default value',
                        key2: 'External value 1',
                        newProperty: true
                    }
                },
                expected: false
            },
            {
                name: 'Property removed',
                obj1: {
                    test1: {
                        key1: 'Default value',
                        key2: 'External value 1'
                    }
                },
                obj2: {
                    test1: {
                        key1: 'Default value'
                    }
                },
                expected: false
            },
            {
                name: 'Property changed',
                obj1: {
                    test1: {
                        key1: 'Default value',
                        key2: 'External value 1'
                    }
                },
                obj2: {
                    test1: {
                        key1: 'Default value',
                        key2: 'changed'
                    }
                },
                expected: false
            }
        ];
        test.each(testCases)('$name', async ({ obj1, obj2, expected }) => {
            expect(isDeepEqual(obj1, obj2)).toEqual(expected);
        });
    });
});
