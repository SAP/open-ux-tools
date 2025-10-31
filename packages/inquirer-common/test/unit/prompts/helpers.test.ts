import type { IMessageSeverity } from '@sap-devx/yeoman-ui-types';
import { Severity } from '@sap-devx/yeoman-ui-types';
import type { Answers } from 'inquirer';
import type { CommonPromptOptions } from '../../../dist';
import {
    extendAdditionalMessages,
    extendValidate,
    extendWithOptions,
    withCondition,
    filterAggregateTransformations
} from '../../../src/prompts/helpers';
import type { PromptDefaultValue, YUIQuestion } from '../../../src/types';
import {
    convertEdmxToConvertedMetadata,
    hasRecursiveHierarchyForEntity,
    getRecursiveHierarchyQualifier,
    hasAggregateTransformationsForEntity,
    transformationsRequiredForAnalyticalTable,
    findEntitySetByName
} from '../../../src/prompts/helpers';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('helpers', () => {
    describe('extendAdditionalMessages', () => {
        it('should return the extended prompt message first', () => {
            const question = {
                name: 'test',
                additionalMessages: (value: unknown) => {
                    if (value === 'test') {
                        return 'test message';
                    }
                }
            } as YUIQuestion;

            const addMsgFunc = (value: unknown) => {
                if (value === 'test') {
                    return { message: 'extended test message', severity: Severity.error };
                }
            };
            const extendedFunc = extendAdditionalMessages(question, addMsgFunc);
            expect(extendedFunc('test')).toStrictEqual({ message: 'extended test message', severity: Severity.error });
        });

        it('should return the original prompt message if the extended message is not valid', () => {
            const question = {
                additionalMessages: (value: unknown) => {
                    if (value === 'test') {
                        return 'test message';
                    }
                }
            } as YUIQuestion;
            const addMsgFunc = (value: unknown) => {
                if (value === 'test') {
                    return undefined;
                }
            };
            const extendedFunc = extendAdditionalMessages(question, addMsgFunc);
            expect(extendedFunc('test')).toBe('test message');
        });

        it('should return the original prompt message if the extended message is not a function', () => {
            const question = {
                additionalMessages: {}
            } as YUIQuestion;

            const addMsgFunc = (value: unknown) => {
                if (value === 'test') {
                    return undefined;
                }
            };
            const extendedFunc = extendAdditionalMessages(question, addMsgFunc);
            expect(extendedFunc('test')).toBe(undefined);
        });
    });

    describe('extendValidate', () => {
        test('should return the extended validate function', () => {
            const question = {
                validate: (input: string) => (input === 'test' ? true : false)
            } as YUIQuestion;

            const validateFunc = (val: string) => (!val ? 'bad input' : true);
            const extendedFunc = extendValidate(question, validateFunc);
            expect(extendedFunc('')).toBe('bad input');
            expect(extendedFunc('test')).toBe(true);
            expect(extendedFunc('badtest')).toBe(false);
        });

        test('should ex', () => {
            const question = {
                validate: (input: string) => (input === 'test' ? true : false)
            } as YUIQuestion;

            const validateFunc = (val: string) => (!val ? 'bad input' : true);
            const extendedFunc = extendValidate(question, validateFunc);
            expect(extendedFunc('')).toBe('bad input');
            expect(extendedFunc('test')).toBe(true);
            expect(extendedFunc('badtest')).toBe(false);
        });
    });

    test('withCondition', () => {
        const questions = [
            {
                type: 'input',
                name: 'A',
                message: 'Message A'
            },
            {
                when: () => false,
                type: 'list',
                name: 'B',
                message: 'Message B'
            },
            {
                when: false,
                type: 'list',
                name: 'C',
                message: 'Message C'
            },
            {
                when: () => true,
                type: 'list',
                name: 'D',
                message: 'Message D'
            },
            {
                when: true,
                type: 'list',
                name: 'E',
                message: 'Message E'
            },
            {
                when: (answers: Record<string, string>) => answers.A === 'answerA',
                type: 'list',
                name: 'F',
                message: 'Message F'
            }
        ];

        const questionsWithTrueCondition = withCondition(questions, () => true);
        expect(questionsWithTrueCondition[0].name).toEqual('A');
        expect((questionsWithTrueCondition[0].when as Function)()).toEqual(true);
        expect(questionsWithTrueCondition[1].name).toEqual('B');
        expect((questionsWithTrueCondition[1].when as Function)()).toEqual(false);
        expect(questionsWithTrueCondition[2].name).toEqual('C');
        expect((questionsWithTrueCondition[2].when as Function)()).toEqual(false);
        expect(questionsWithTrueCondition[3].name).toEqual('D');
        expect((questionsWithTrueCondition[3].when as Function)()).toEqual(true);
        expect(questionsWithTrueCondition[4].name).toEqual('E');
        expect((questionsWithTrueCondition[4].when as Function)()).toEqual(true);
        expect(questionsWithTrueCondition[5].name).toEqual('F');
        expect((questionsWithTrueCondition[5].when as Function)({ A: 'answerA' })).toEqual(true);
        expect((questionsWithTrueCondition[5].when as Function)({ A: 'answerA1' })).toEqual(false);

        const questionsWithAnswersCondition = withCondition(
            questions,
            (answers: Record<string, string>) => answers.B === 'answerB'
        );
        expect(questionsWithAnswersCondition[0].name).toEqual('A');
        expect((questionsWithAnswersCondition[0].when as Function)({ B: 'answerB' })).toEqual(true);
        expect(questionsWithAnswersCondition[1].name).toEqual('B');
        expect((questionsWithAnswersCondition[1].when as Function)({ B: 'answerB' })).toEqual(false);
        expect(questionsWithAnswersCondition[2].name).toEqual('C');
        expect((questionsWithAnswersCondition[2].when as Function)({ B: 'answerB' })).toEqual(false);
        expect(questionsWithAnswersCondition[3].name).toEqual('D');
        expect((questionsWithAnswersCondition[3].when as Function)({ B: 'answerB' })).toEqual(true);
        expect(questionsWithAnswersCondition[4].name).toEqual('E');
        expect((questionsWithAnswersCondition[4].when as Function)({ B: 'answerB' })).toEqual(true);
        expect(questionsWithAnswersCondition[5].name).toEqual('F');
        expect((questionsWithAnswersCondition[5].when as Function)({ B: 'answerB' })).toEqual(false);
        expect((questionsWithAnswersCondition[5].when as Function)({ A: 'answerA', B: 'answerB' })).toEqual(true);

        const questionsWithFalseCondition = withCondition(questions, () => false);
        expect(questionsWithFalseCondition[0].name).toEqual('A');
        expect((questionsWithFalseCondition[0].when as Function)()).toEqual(false);
    });

    test('extendWithOptions, no options specified', () => {
        const promptNameA = 'promptA';
        const promptNameB = 'promptB';
        const questions = [
            {
                type: 'input',
                name: promptNameA,
                message: 'Message A',
                validate: (input: string) => !!input
            },
            {
                type: 'input',
                name: promptNameB,
                message: 'Message B',
                validate: (input: string) => !!input
            }
        ] as YUIQuestion[];

        // No options provided
        const extQuestions = extendWithOptions(questions, {});
        expect(extendWithOptions(questions, {})).toEqual(questions);
        const nameQuestionValidate = extQuestions.find((question) => question.name === promptNameA)
            ?.validate as Function;
        expect(nameQuestionValidate('')).toEqual(false);
        expect(nameQuestionValidate('a')).toEqual(true);

        const descriptionQuestionValidate = extQuestions.find((question) => question.name === promptNameB)
            ?.validate as Function;
        expect(descriptionQuestionValidate('')).toEqual(false);
        expect(descriptionQuestionValidate('a')).toEqual(true);
    });

    test('extendWithOptions, `validate` and `default` prompt options specified', () => {
        const promptNameA = 'promptA';
        const questionA = {
            type: 'input',
            name: promptNameA,
            message: 'Message',
            default: false
        };

        let promptOptions: Record<string, CommonPromptOptions & PromptDefaultValue<string | boolean>> = {
            [promptNameA]: {
                validate: (val) => (!val ? 'bad input' : true),
                default: () => 'some default val from func'
            }
        };

        let extQuestions = extendWithOptions([questionA], promptOptions);
        let nameQuestion = extQuestions.find((question) => question.name === promptNameA);
        let nameQuestionDefault = nameQuestion?.default as Function;
        // Default value should override original value
        expect(nameQuestionDefault()).toEqual('some default val from func');
        // No validate in original question, should apply extension
        let nameQuestionValidate = nameQuestion?.validate as Function;
        expect(nameQuestionValidate(undefined)).toEqual('bad input');
        expect(nameQuestionValidate('good')).toEqual(true);

        // Test that original validator is still applied
        const questionB = {
            type: 'input',
            name: promptNameA,
            message: 'Message',
            default: false,
            validate: (val: string) => (val === 'bad input B' ? `Input: "${val}" is invalid` : true)
        };

        promptOptions = {
            [promptNameA]: {
                validate: (val) => (!val ? 'bad input' : true)
            }
        };

        extQuestions = extendWithOptions([questionB], promptOptions);
        nameQuestion = extQuestions.find((question) => question.name === promptNameA);
        nameQuestionDefault = nameQuestion?.default;
        // Default value should override original value
        // Default value should use original value
        expect(nameQuestionDefault).toEqual(false);
        // Both original and extended validation is applied
        nameQuestionValidate = nameQuestion?.validate as Function;
        expect(nameQuestionValidate(undefined)).toEqual('bad input');
        expect(nameQuestionValidate('bad input B')).toEqual('Input: "bad input B" is invalid');
        expect(nameQuestionValidate('good')).toEqual(true);

        // Previous answers are provided to extended validator/default funcs
        const promptNameB = 'promptB';
        const questions = [
            {
                type: 'input',
                name: promptNameA,
                message: 'Message A'
            },
            {
                type: 'input',
                name: promptNameB,
                message: 'Message B',
                validate: (input: string) => !!input,
                default: 'description'
            }
        ] as YUIQuestion[];

        promptOptions = {
            [promptNameA]: {
                validate: (input: string, answers: Answers | undefined) =>
                    input === 'name1' && answers?.description === 'abcd'
            },
            [promptNameB]: {
                default: (answers: Answers | undefined) => (answers?.name === '1234' ? '1234 description' : 'none')
            }
        };

        // Options with validate funcs
        extQuestions = extendWithOptions(questions, promptOptions);
        nameQuestionValidate = extQuestions.find((question) => question.name === promptNameA)?.validate as Function;
        expect(nameQuestionValidate('name1', { description: 'abcd' })).toEqual(true);
        expect(nameQuestionValidate('name1', { description: 'efgh' })).toEqual(false);

        // Defaults should be replaced
        const descriptionQuestionDefault = extQuestions.find((question) => question.name === promptNameB)?.default;
        expect(descriptionQuestionDefault()).toEqual('none');
        expect(descriptionQuestionDefault({ name: '1234' })).toEqual('1234 description');
    });

    test('extendWithOptions: `additionaMessages` options specified', () => {
        const promptNameA = 'promptA';
        // Additional messages
        const confirmQuestion = {
            type: 'confirm',
            name: promptNameA,
            message: 'Message',
            default: false
        } as YUIQuestion;

        const addMessageWarn: IMessageSeverity = {
            message: 'You must enter something',
            severity: Severity.warning
        };

        const addMessageInfo: IMessageSeverity = { message: 'thanks!', severity: Severity.information };

        let promptOptions: Record<string, CommonPromptOptions> = {
            [promptNameA]: {
                additionalMessages: (val) => (!val ? addMessageWarn : addMessageInfo)
            }
        };

        let extQuestions = extendWithOptions([confirmQuestion], promptOptions);
        let additionalMessages = extQuestions.find((question) => question.name === promptNameA)
            ?.additionalMessages as Function;
        // Default value should use original value
        expect(additionalMessages()).toEqual(addMessageWarn);
        expect(additionalMessages(true)).toEqual(addMessageInfo);

        // Ensure override behaviour, use existing message if no message (undefined) returned
        const baseMsgWarn = {
            message: 'This is the base msg',
            severity: Severity.warning
        };
        const promptNameB = 'propmtNameB';
        const inputQuestion = {
            type: 'input',
            name: promptNameB,
            message: 'Message',
            default: false,
            additionalMessages: (): IMessageSeverity => baseMsgWarn
        } as YUIQuestion;
        const addMessageError = {
            message: 'The input value will result in an error',
            severity: Severity.warning
        };
        const previousAnswers: Answers = {
            a: 123,
            b: true,
            c: {
                name: 'name',
                value: 'somevalue'
            }
        };
        promptOptions = {
            [promptNameB]: {
                additionalMessages: (val, previousAnswers) => {
                    if (val == 'abc' && previousAnswers?.a === 123) {
                        return addMessageError;
                    }
                    if (val === 'abc') {
                        return addMessageInfo;
                    }
                }
            }
        };
        extQuestions = extendWithOptions([inputQuestion], promptOptions);
        additionalMessages = extQuestions.find((question) => question.name === promptNameB)
            ?.additionalMessages as Function;
        // Default value should use original value
        expect(additionalMessages()).toEqual(baseMsgWarn);
        // Previous answers tests
        expect(additionalMessages('abc', previousAnswers)).toEqual(addMessageError);
        expect(additionalMessages('def')).toEqual(baseMsgWarn);

        // Ensure only relevant prompt is updated
        const testNameAddMsg = { message: 'success', severity: Severity.information };
        promptOptions = {
            ['A']: {
                additionalMessages: (val) => (val === 'testName' ? testNameAddMsg : undefined)
            }
        };
        extQuestions = extendWithOptions([{ name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }], promptOptions);
        expect(extQuestions).toMatchInlineSnapshot(`
            [
              {
                "additionalMessages": [Function],
                "name": "A",
              },
              {
                "name": "B",
              },
              {
                "name": "C",
              },
              {
                "name": "D",
              },
            ]
        `);
        additionalMessages = extQuestions.find((question) => question.name === 'A')?.additionalMessages as Function;
        expect(additionalMessages('testName')).toEqual(testNameAddMsg);
    });

    describe('aggregate transformation helpers', () => {
        let metadata: ReturnType<typeof convertEdmxToConvertedMetadata>;

        beforeAll(() => {
            const edmx = fs.readFileSync(
                path.resolve(__dirname, 'fixtures/metadataV4WithAggregateTransforms.xml'),
                'utf-8'
            );
            metadata = convertEdmxToConvertedMetadata(edmx);
        });

        describe('filterAggregateTransformations', () => {
            it('should return only entity sets with aggregate transformations in entity set annotations', () => {
                const mockEntitySets: any[] = [
                    {
                        name: 'EntityWithTransforms',
                        annotations: {
                            'Aggregation': {
                                'ApplySupported': {
                                    'Transformations': ['filter', 'orderby', 'groupby']
                                }
                            }
                        },
                        entityType: {}
                    },
                    {
                        name: 'EntityWithoutTransforms',
                        annotations: {},
                        entityType: {}
                    }
                ];

                const result = filterAggregateTransformations(mockEntitySets);
                expect(result).toHaveLength(1);
                expect(result[0].name).toBe('EntityWithTransforms');
            });

            it('should return only entity sets with aggregate transformations in entity type annotations', () => {
                const mockEntitySets: any[] = [
                    {
                        name: 'EntityWithTypeTransforms',
                        annotations: {},
                        entityType: {
                            annotations: {
                                'Aggregation': {
                                    'ApplySupported': {
                                        'Transformations': ['filter', 'orderby']
                                    }
                                }
                            }
                        }
                    },
                    {
                        name: 'EntityWithoutTransforms',
                        annotations: {},
                        entityType: {
                            annotations: {}
                        }
                    }
                ];

                const result = filterAggregateTransformations(mockEntitySets);
                expect(result).toHaveLength(1);
                expect(result[0].name).toBe('EntityWithTypeTransforms');
            });

            it('should return entity sets with transformations in either entity set or entity type annotations', () => {
                const mockEntitySets: any[] = [
                    {
                        name: 'EntitySetTransforms',
                        annotations: {
                            'Aggregation': {
                                'ApplySupported': {
                                    'Transformations': ['filter']
                                }
                            }
                        },
                        entityType: {}
                    },
                    {
                        name: 'EntityTypeTransforms',
                        annotations: {},
                        entityType: {
                            annotations: {
                                'Aggregation': {
                                    'ApplySupported': {
                                        'Transformations': ['orderby']
                                    }
                                }
                            }
                        }
                    },
                    {
                        name: 'NoTransforms',
                        annotations: {},
                        entityType: {}
                    }
                ];

                const result = filterAggregateTransformations(mockEntitySets);
                expect(result).toHaveLength(2);
                expect(result.map((e) => e.name)).toEqual(['EntitySetTransforms', 'EntityTypeTransforms']);
            });

            it('should return empty array when no entity sets have transformations', () => {
                const mockEntitySets: any[] = [
                    {
                        name: 'Entity1',
                        annotations: {},
                        entityType: {}
                    },
                    {
                        name: 'Entity2',
                        annotations: {},
                        entityType: {
                            annotations: {}
                        }
                    }
                ];

                const result = filterAggregateTransformations(mockEntitySets);
                expect(result).toHaveLength(0);
            });

            it('should return empty array when input array is empty', () => {
                const result = filterAggregateTransformations([]);
                expect(result).toHaveLength(0);
            });

            it('should handle entity sets with partial annotation structures', () => {
                const mockEntitySets: any[] = [
                    {
                        name: 'PartialAnnotations1',
                        annotations: {
                            'Aggregation': {
                                'ApplySupported': {} // No Transformations property
                            }
                        },
                        entityType: {}
                    },
                    {
                        name: 'PartialAnnotations2',
                        annotations: {
                            'Aggregation': {} // No ApplySupported property
                        },
                        entityType: {}
                    },
                    {
                        name: 'ValidEntity',
                        annotations: {
                            'Aggregation': {
                                'ApplySupported': {
                                    'Transformations': ['filter']
                                }
                            }
                        },
                        entityType: {}
                    }
                ];

                const result = filterAggregateTransformations(mockEntitySets);
                expect(result).toHaveLength(1);
                expect(result[0].name).toBe('ValidEntity');
            });
        });

        describe('hasAggregateTransformationsForEntity (merged function)', () => {
            it('should return true for entities with any transformations when no specific transformations required', () => {
                const mockMetadata: any = {
                    version: '4.0',
                    namespace: 'Test.Service',
                    entitySets: [
                        {
                            name: 'EntityWithSomeTransforms',
                            entityType: {
                                annotations: {
                                    'Aggregation': {
                                        'ApplySupported': {
                                            'Transformations': ['filter', 'orderby'] // Only 2 transformations
                                        }
                                    }
                                }
                            }
                        }
                    ]
                };

                expect(hasAggregateTransformationsForEntity(mockMetadata, 'EntityWithSomeTransforms')).toBe(true);
            });

            it('should return true for entities with all required transformations when specific transformations required', () => {
                const mockMetadata: any = {
                    version: '4.0',
                    namespace: 'Test.Service',
                    entitySets: [
                        {
                            name: 'CompleteEntity',
                            entityType: {
                                annotations: {
                                    'Aggregation': {
                                        'ApplySupported': {
                                            'Transformations': transformationsRequiredForAnalyticalTable
                                        }
                                    }
                                }
                            }
                        }
                    ]
                };

                expect(
                    hasAggregateTransformationsForEntity(
                        mockMetadata,
                        'CompleteEntity',
                        transformationsRequiredForAnalyticalTable
                    )
                ).toBe(true);
            });

            it('should return false for entities with partial transformations when specific transformations required', () => {
                const mockMetadata: any = {
                    version: '4.0',
                    namespace: 'Test.Service',
                    entitySets: [
                        {
                            name: 'PartialEntity',
                            entityType: {
                                annotations: {
                                    'Aggregation': {
                                        'ApplySupported': {
                                            'Transformations': ['filter', 'orderby', 'search'] // Missing some required transformations
                                        }
                                    }
                                }
                            }
                        }
                    ]
                };

                expect(
                    hasAggregateTransformationsForEntity(
                        mockMetadata,
                        'PartialEntity',
                        transformationsRequiredForAnalyticalTable
                    )
                ).toBe(false);
            });

            it('should return false for entities without transformations', () => {
                const mockMetadata: any = {
                    version: '4.0',
                    namespace: 'Test.Service',
                    entitySets: [
                        {
                            name: 'NoTransformsEntity',
                            entityType: {
                                annotations: {}
                            }
                        }
                    ]
                };

                expect(hasAggregateTransformationsForEntity(mockMetadata, 'NoTransformsEntity')).toBe(false);
                expect(
                    hasAggregateTransformationsForEntity(
                        mockMetadata,
                        'NoTransformsEntity',
                        transformationsRequiredForAnalyticalTable
                    )
                ).toBe(false);
            });

            it('should return false for non-existent entity sets', () => {
                const mockMetadata: any = {
                    version: '4.0',
                    namespace: 'Test.Service',
                    entitySets: []
                };

                expect(hasAggregateTransformationsForEntity(mockMetadata, 'NonExistent')).toBe(false);
                expect(
                    hasAggregateTransformationsForEntity(
                        mockMetadata,
                        'NonExistent',
                        transformationsRequiredForAnalyticalTable
                    )
                ).toBe(false);
            });

            it('should work with custom transformation requirements', () => {
                const mockMetadata: any = {
                    version: '4.0',
                    namespace: 'Test.Service',
                    entitySets: [
                        {
                            name: 'CustomEntity',
                            entityType: {
                                annotations: {
                                    'Aggregation': {
                                        'ApplySupported': {
                                            'Transformations': ['filter', 'orderby', 'search']
                                        }
                                    }
                                }
                            }
                        }
                    ]
                };

                const customRequirements = ['filter', 'orderby'];
                expect(hasAggregateTransformationsForEntity(mockMetadata, 'CustomEntity', customRequirements)).toBe(
                    true
                );

                const strictRequirements = ['filter', 'orderby', 'search', 'groupby'];
                expect(hasAggregateTransformationsForEntity(mockMetadata, 'CustomEntity', strictRequirements)).toBe(
                    false
                );
            });
        });

        it('hasAggregateTransformationsForEntity should return true when all required transformations are present', () => {
            // Create mock metadata with complete transformations
            const completeMetadata: any = {
                version: '4.0',
                namespace: 'Test.Service',
                entitySets: [
                    {
                        name: 'CompleteEntity',
                        entityTypeName: 'CompleteType',
                        entityType: {
                            name: 'CompleteType',
                            annotations: {
                                'Aggregation': {
                                    'ApplySupported': {
                                        'Transformations': [
                                            'filter',
                                            'identity',
                                            'orderby',
                                            'search',
                                            'skip',
                                            'top',
                                            'groupby',
                                            'aggregate',
                                            'concat'
                                        ]
                                    }
                                }
                            },
                            keys: [],
                            properties: [],
                            navigationProperties: []
                        }
                    }
                ],
                entityTypes: [],
                entityContainer: {}
            };

            expect(
                hasAggregateTransformationsForEntity(
                    completeMetadata,
                    'CompleteEntity',
                    transformationsRequiredForAnalyticalTable
                )
            ).toBe(true);
        });

        it('hasAggregateTransformationsForEntity should return false when not all required transformations are present', () => {
            // Create mock metadata with only some transformations (missing identity, skip, top, groupby, aggregate, concat)
            const partialMetadata: any = {
                version: '4.0',
                namespace: 'Test.Service',
                entitySets: [
                    {
                        name: 'PartialEntity',
                        entityTypeName: 'PartialType',
                        entityType: {
                            name: 'PartialType',
                            annotations: {
                                'Aggregation': {
                                    'ApplySupported': {
                                        'Transformations': ['filter', 'orderby', 'search']
                                    }
                                }
                            },
                            keys: [],
                            properties: [],
                            navigationProperties: []
                        }
                    }
                ],
                entityTypes: [],
                entityContainer: {}
            };

            expect(
                hasAggregateTransformationsForEntity(
                    partialMetadata,
                    'PartialEntity',
                    transformationsRequiredForAnalyticalTable
                )
            ).toBe(false);
        });

        it('hasAggregateTransformationsForEntity should return false for entities without any transformations', () => {
            const noTransformMetadata: any = {
                version: '4.0',
                namespace: 'Test.Service',
                entitySets: [
                    {
                        name: 'NoTransformEntity',
                        entityTypeName: 'NoTransformType',
                        entityType: {
                            name: 'NoTransformType',
                            annotations: {},
                            keys: [],
                            properties: [],
                            navigationProperties: []
                        }
                    }
                ],
                entityTypes: [],
                entityContainer: {}
            };

            expect(
                hasAggregateTransformationsForEntity(
                    noTransformMetadata,
                    'NoTransformEntity',
                    transformationsRequiredForAnalyticalTable
                )
            ).toBe(false);
        });

        it('hasAggregateTransformationsForEntity should return false for non-existent entity sets', () => {
            expect(
                hasAggregateTransformationsForEntity(
                    metadata,
                    'NonExistentEntity',
                    transformationsRequiredForAnalyticalTable
                )
            ).toBe(false);
        });

        it('hasAggregateTransformationsForEntity should return true if all transformations are present in entity set annotations', () => {
            // Test with transformations directly on entity set (not just entity type)
            const entitySetMetadata: any = {
                version: '4.0',
                namespace: 'Test.Service',
                entitySets: [
                    {
                        name: 'EntitySetTransforms',
                        entityTypeName: 'EntitySetType',
                        annotations: {
                            'Aggregation': {
                                'ApplySupported': {
                                    'Transformations': [
                                        'filter',
                                        'identity',
                                        'orderby',
                                        'search',
                                        'skip',
                                        'top',
                                        'groupby',
                                        'aggregate',
                                        'concat'
                                    ]
                                }
                            }
                        },
                        entityType: {
                            name: 'EntitySetType',
                            annotations: {},
                            keys: [],
                            properties: [],
                            navigationProperties: []
                        }
                    }
                ],
                entityTypes: [],
                entityContainer: {}
            };

            expect(
                hasAggregateTransformationsForEntity(
                    entitySetMetadata,
                    'EntitySetTransforms',
                    transformationsRequiredForAnalyticalTable
                )
            ).toBe(true);
        });

        it('should throw if EDMX is not valid XML', () => {
            expect(() => convertEdmxToConvertedMetadata('<not><valid></xml>')).toThrow();
        });

        it('should throw if EDMX has unparseable OData version', () => {
            // Minimal valid XML with missing/invalid version
            const badVersionEdmx = `<?xml version="1.0" encoding="utf-8" ?>\n<edmx:Edmx Version=\"notanumber\" xmlns:edmx=\"http://docs.oasis-open.org/odata/ns/edmx\"><edmx:DataServices></edmx:DataServices></edmx:Edmx>`;
            expect(() => convertEdmxToConvertedMetadata(badVersionEdmx)).toThrow();
        });
    });

    describe('recursive hierarchy helpers', () => {
        it('hasRecursiveHierarchyForEntity should return true for entities with Hierarchy.RecursiveHierarchy annotation', () => {
            // Create a mock metadata with recursive hierarchy
            const mockMetadata: any = {
                version: '4.0',
                namespace: 'Test.Service',
                entitySets: [
                    {
                        name: 'TestEntity',
                        entityTypeName: 'TestType',
                        entityType: {
                            name: 'TestType',
                            annotations: {
                                'Hierarchy': {
                                    'RecursiveHierarchy': {
                                        NodeProperty: {
                                            $PropertyPath: 'NodeId'
                                        },
                                        ParentNavigationProperty: {
                                            $NavigationPropertyPath: 'Parent'
                                        }
                                    }
                                }
                            },
                            keys: [],
                            properties: [],
                            navigationProperties: []
                        }
                    }
                ],
                entityTypes: [],
                entityContainer: {}
            };

            expect(hasRecursiveHierarchyForEntity(mockMetadata, 'TestEntity')).toBe(true);
        });

        it('hasRecursiveHierarchyForEntity should return false for entities without recursive hierarchy annotation', () => {
            const mockMetadata: any = {
                version: '4.0',
                namespace: 'Test.Service',
                entitySets: [
                    {
                        name: 'TestEntity',
                        entityTypeName: 'TestType',
                        entityType: {
                            name: 'TestType',
                            annotations: {},
                            keys: [],
                            properties: [],
                            navigationProperties: []
                        }
                    }
                ],
                entityTypes: [],
                entityContainer: {}
            };

            expect(hasRecursiveHierarchyForEntity(mockMetadata, 'TestEntity')).toBe(false);
        });

        it('hasRecursiveHierarchyForEntity should return false for non-existent entity set', () => {
            const mockMetadata: any = {
                version: '4.0',
                namespace: 'Test.Service',
                entitySets: [
                    {
                        name: 'TestEntity',
                        entityTypeName: 'TestType',
                        entityType: {
                            name: 'TestType',
                            annotations: {
                                'Hierarchy': {
                                    'RecursiveHierarchy': {
                                        NodeProperty: {
                                            $PropertyPath: 'NodeId'
                                        }
                                    }
                                }
                            },
                            keys: [],
                            properties: [],
                            navigationProperties: []
                        }
                    }
                ],
                entityTypes: [],
                entityContainer: {}
            };

            expect(hasRecursiveHierarchyForEntity(mockMetadata, 'NonExistentEntity')).toBe(false);
        });

        it('hasRecursiveHierarchyForEntity should return true for entities with qualified RecursiveHierarchy annotation', () => {
            // Test for real-world scenario where RecursiveHierarchy has a qualifier
            const mockMetadata: any = {
                version: '4.0',
                namespace: 'Test.Service',
                entitySets: [
                    {
                        name: 'TestEntity',
                        entityTypeName: 'TestType',
                        entityType: {
                            name: 'TestType',
                            annotations: {
                                'Hierarchy': {
                                    'RecursiveHierarchy#CompanyNode': {
                                        NodeProperty: {
                                            $PropertyPath: 'NodeId'
                                        },
                                        ParentNavigationProperty: {
                                            $NavigationPropertyPath: 'Parent'
                                        }
                                    }
                                }
                            },
                            keys: [],
                            properties: [],
                            navigationProperties: []
                        }
                    }
                ],
                entityTypes: [],
                entityContainer: {}
            };

            expect(hasRecursiveHierarchyForEntity(mockMetadata, 'TestEntity')).toBe(true);
        });
    });

    describe('getRecursiveHierarchyQualifier', () => {
        it('should return qualifier for entity with qualified RecursiveHierarchy annotation', () => {
            const mockMetadata: any = {
                version: '4.0',
                namespace: 'Test.Service',
                entitySets: [
                    {
                        name: 'TestEntity',
                        entityTypeName: 'TestType',
                        entityType: {
                            name: 'TestType',
                            annotations: {
                                'Hierarchy': {
                                    'RecursiveHierarchy#CompanyNode': {
                                        NodeProperty: {
                                            $PropertyPath: 'NodeId'
                                        }
                                    }
                                }
                            },
                            keys: [],
                            properties: [],
                            navigationProperties: []
                        }
                    }
                ],
                entityTypes: [],
                entityContainer: {}
            };

            expect(getRecursiveHierarchyQualifier(mockMetadata, 'TestEntity')).toBe('CompanyNode');
        });

        it('should return undefined for entity with unqualified RecursiveHierarchy annotation', () => {
            const mockMetadata: any = {
                version: '4.0',
                namespace: 'Test.Service',
                entitySets: [
                    {
                        name: 'TestEntity',
                        entityTypeName: 'TestType',
                        entityType: {
                            name: 'TestType',
                            annotations: {
                                'Hierarchy': {
                                    'RecursiveHierarchy': {
                                        NodeProperty: {
                                            $PropertyPath: 'NodeId'
                                        }
                                    }
                                }
                            },
                            keys: [],
                            properties: [],
                            navigationProperties: []
                        }
                    }
                ],
                entityTypes: [],
                entityContainer: {}
            };

            expect(getRecursiveHierarchyQualifier(mockMetadata, 'TestEntity')).toBeUndefined();
        });

        it('should return undefined for entity without RecursiveHierarchy annotation', () => {
            const mockMetadata: any = {
                version: '4.0',
                namespace: 'Test.Service',
                entitySets: [
                    {
                        name: 'TestEntity',
                        entityTypeName: 'TestType',
                        entityType: {
                            name: 'TestType',
                            annotations: {
                                'UI': {
                                    'LineItem': []
                                }
                            },
                            keys: [],
                            properties: [],
                            navigationProperties: []
                        }
                    }
                ],
                entityTypes: [],
                entityContainer: {}
            };

            expect(getRecursiveHierarchyQualifier(mockMetadata, 'TestEntity')).toBeUndefined();
        });

        it('should return undefined for non-existent entity set', () => {
            const mockMetadata: any = {
                version: '4.0',
                namespace: 'Test.Service',
                entitySets: [],
                entityTypes: [],
                entityContainer: {}
            };

            expect(getRecursiveHierarchyQualifier(mockMetadata, 'NonExistentEntity')).toBeUndefined();
        });
    });

    describe('hasAggregateTransformationsForEntity', () => {
        it('should return true when entity set has ApplySupported annotation', () => {
            const mockMetadata: any = {
                version: '4.0',
                namespace: 'Test.Service',
                entitySets: [
                    {
                        name: 'TestEntity',
                        entityTypeName: 'TestType',
                        annotations: {
                            'Aggregation': {
                                'ApplySupported': {
                                    Transformations: ['filter', 'groupby', 'aggregate']
                                }
                            }
                        },
                        entityType: {
                            name: 'TestType',
                            annotations: {},
                            keys: [],
                            properties: [],
                            navigationProperties: []
                        }
                    }
                ],
                entityTypes: [],
                entityContainer: {}
            };

            expect(hasAggregateTransformationsForEntity(mockMetadata, 'TestEntity')).toBe(true);
        });

        it('should return true when entity type has ApplySupported annotation', () => {
            const mockMetadata: any = {
                version: '4.0',
                namespace: 'Test.Service',
                entitySets: [
                    {
                        name: 'TestEntity',
                        entityTypeName: 'TestType',
                        annotations: {},
                        entityType: {
                            name: 'TestType',
                            annotations: {
                                'Aggregation': {
                                    'ApplySupported': {
                                        Transformations: ['filter', 'groupby']
                                    }
                                }
                            },
                            keys: [],
                            properties: [],
                            navigationProperties: []
                        }
                    }
                ],
                entityTypes: [],
                entityContainer: {}
            };

            expect(hasAggregateTransformationsForEntity(mockMetadata, 'TestEntity')).toBe(true);
        });

        it('should return false when ApplySupported annotation exists without Transformations', () => {
            const mockMetadata: any = {
                version: '4.0',
                namespace: 'Test.Service',
                entitySets: [
                    {
                        name: 'TestEntity',
                        entityTypeName: 'TestType',
                        annotations: {
                            'Aggregation': {
                                'ApplySupported': {}
                            }
                        },
                        entityType: {
                            name: 'TestType',
                            annotations: {},
                            keys: [],
                            properties: [],
                            navigationProperties: []
                        }
                    }
                ],
                entityTypes: [],
                entityContainer: {}
            };

            expect(hasAggregateTransformationsForEntity(mockMetadata, 'TestEntity')).toBe(false);
        });

        it('should return false when entity has no ApplySupported annotation', () => {
            const mockMetadata: any = {
                version: '4.0',
                namespace: 'Test.Service',
                entitySets: [
                    {
                        name: 'TestEntity',
                        entityTypeName: 'TestType',
                        annotations: {},
                        entityType: {
                            name: 'TestType',
                            annotations: {},
                            keys: [],
                            properties: [],
                            navigationProperties: []
                        }
                    }
                ],
                entityTypes: [],
                entityContainer: {}
            };

            expect(hasAggregateTransformationsForEntity(mockMetadata, 'TestEntity')).toBe(false);
        });

        it('should return false for non-existent entity set', () => {
            const mockMetadata: any = {
                version: '4.0',
                namespace: 'Test.Service',
                entitySets: [],
                entityTypes: [],
                entityContainer: {}
            };

            expect(hasAggregateTransformationsForEntity(mockMetadata, 'NonExistentEntity')).toBe(false);
        });
    });

    describe('findEntitySetByName', () => {
        it('should return the correct entity set when found', () => {
            const mockMetadata: any = {
                version: '4.0',
                namespace: 'Test.Service',
                entitySets: [
                    {
                        name: 'TestEntity',
                        entityTypeName: 'TestType',
                        annotations: {}
                    },
                    {
                        name: 'AnotherEntity',
                        entityTypeName: 'AnotherType',
                        annotations: {}
                    }
                ],
                entityTypes: [],
                entityContainer: {}
            };

            const result = findEntitySetByName(mockMetadata, 'TestEntity');
            expect(result).toBeDefined();
            expect(result?.name).toBe('TestEntity');
            expect(result?.entityTypeName).toBe('TestType');
        });

        it('should return undefined when entity set is not found', () => {
            const mockMetadata: any = {
                version: '4.0',
                namespace: 'Test.Service',
                entitySets: [
                    {
                        name: 'TestEntity',
                        entityTypeName: 'TestType',
                        annotations: {}
                    }
                ],
                entityTypes: [],
                entityContainer: {}
            };

            const result = findEntitySetByName(mockMetadata, 'NonExistentEntity');
            expect(result).toBeUndefined();
        });

        it('should handle empty entitySets array', () => {
            const mockMetadata: any = {
                version: '4.0',
                namespace: 'Test.Service',
                entitySets: [],
                entityTypes: [],
                entityContainer: {}
            };

            const result = findEntitySetByName(mockMetadata, 'TestEntity');
            expect(result).toBeUndefined();
        });
    });
});
