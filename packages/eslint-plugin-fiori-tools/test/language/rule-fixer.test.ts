import type { MemberNode } from '@humanwhocodes/momoa';
import type { JSONRuleContext } from '../../src/language/rule-factory';
import { createJsonFixer } from '../../src/language/rule-fixer';
import type { DeepestExistingPathResult } from '../../src/utils/helpers';

describe('createJsonFixer', () => {
    // Mock fixer object that simulates ESLint's fixer API
    const createMockFixer = () => ({
        replaceTextRange: jest.fn((range: [number, number], text: string) => ({
            type: 'replace',
            range,
            text
        })),
        insertTextBeforeRange: jest.fn((range: [number, number], text: string) => ({
            type: 'insert',
            range,
            text
        })),
        removeRange: jest.fn((range: [number, number]) => ({
            type: 'remove',
            range,
            text: ''
        })),
        insertTextAfter: jest.fn((node: unknown, text: string) => ({
            type: 'insertAfter',
            range: [0, 0] as [number, number],
            text
        })),
        insertTextAfterRange: jest.fn((range: [number, number], text: string) => ({
            type: 'insertAfter',
            range,
            text
        })),
        insertTextBefore: jest.fn((node: unknown, text: string) => ({
            type: 'insertBefore',
            range: [0, 0] as [number, number],
            text
        })),
        remove: jest.fn((node: unknown) => ({
            type: 'remove',
            range: [0, 0] as [number, number],
            text: ''
        })),
        replaceText: jest.fn((node: unknown, text: string) => ({
            type: 'replace',
            range: [0, 0] as [number, number],
            text
        }))
    });

    // Mock context
    const mockContext = {
        sourceCode: {},
        report: jest.fn()
    } as unknown as JSONRuleContext<string, unknown[]>;

    describe('UPDATE operation', () => {
        it('should update a boolean value', () => {
            const node = {
                name: {
                    type: 'String',
                    value: 'flexEnabled',
                    loc: { start: { offset: 10 }, end: { offset: 21 } }
                },
                value: {
                    type: 'Boolean',
                    value: false,
                    range: [24, 29],
                    loc: { start: { offset: 24 }, end: { offset: 29 } }
                }
            } as MemberNode;

            const deepestPathResult: DeepestExistingPathResult = {
                validatedPath: ['sap.ui5', 'flexEnabled'],
                missingSegments: []
            };

            const fixer = createMockFixer();
            const fixerFn = createJsonFixer({
                context: mockContext,
                node,
                deepestPathResult,
                value: true
            });

            const result = fixerFn!(fixer);

            expect(fixer.replaceTextRange).toHaveBeenCalledWith([24, 29], 'true');
            expect(result).toMatchSnapshot();
        });

        it('should update a string value', () => {
            const node = {
                name: {
                    type: 'String',
                    value: 'title'
                },
                value: {
                    type: 'String',
                    value: 'Old Title',
                    range: [15, 26],
                    loc: { start: { offset: 15 }, end: { offset: 26 } }
                }
            } as MemberNode;

            const deepestPathResult: DeepestExistingPathResult = {
                validatedPath: ['title'],
                missingSegments: []
            };

            const fixer = createMockFixer();
            const fixerFn = createJsonFixer({
                context: mockContext,
                node,
                deepestPathResult,
                value: 'New Title'
            });

            const result = fixerFn!(fixer);

            expect(fixer.replaceTextRange).toHaveBeenCalledWith([15, 26], '"New Title"');
            expect(result).toMatchSnapshot();
        });

        it('should update a number value', () => {
            const node = {
                value: {
                    type: 'Number',
                    value: 42,
                    range: [10, 12],
                    loc: { start: { offset: 10 }, end: { offset: 12 } }
                }
            } as MemberNode;

            const deepestPathResult: DeepestExistingPathResult = {
                validatedPath: ['count'],
                missingSegments: []
            };

            const fixer = createMockFixer();
            const fixerFn = createJsonFixer({
                context: mockContext,
                node,
                deepestPathResult,
                value: 100
            });

            const result = fixerFn!(fixer);

            expect(fixer.replaceTextRange).toHaveBeenCalledWith([10, 12], '100');
            expect(result).toMatchSnapshot();
        });

        it('should update an object value', () => {
            const node = {
                value: {
                    type: 'Object',
                    range: [10, 25],
                    loc: { start: { offset: 10 }, end: { offset: 25 } }
                }
            } as MemberNode;

            const deepestPathResult: DeepestExistingPathResult = {
                validatedPath: ['config'],
                missingSegments: []
            };

            const fixer = createMockFixer();
            const fixerFn = createJsonFixer({
                context: mockContext,
                node,
                deepestPathResult,
                value: { enabled: true, count: 5 }
            });

            const result = fixerFn!(fixer);

            expect(fixer.replaceTextRange).toHaveBeenCalledWith([10, 25], expect.stringContaining('"enabled": true'));
            expect(result).toMatchSnapshot();
        });
    });

    describe('INSERT operation', () => {
        it('should insert a new property into an empty object', () => {
            const node = {
                name: {
                    type: 'String',
                    value: 'sap.ui5',
                    loc: {
                        start: { offset: 20, column: 4 },
                        end: { offset: 22, column: 4 }
                    }
                },
                value: {
                    type: 'Object',
                    members: [],
                    loc: {
                        start: { offset: 23, column: 4 },
                        end: { offset: 25, column: 4 }
                    }
                }
            } as unknown as MemberNode;

            const deepestPathResult: DeepestExistingPathResult = {
                validatedPath: ['sap.ui5'],
                missingSegments: ['flexEnabled']
            };

            const fixer = createMockFixer();
            const fixerFn = createJsonFixer({
                context: mockContext,
                node,
                deepestPathResult,
                value: true
            });

            const result = fixerFn!(fixer);

            expect(fixer.insertTextBeforeRange).toHaveBeenCalled();
            expect(result).toMatchSnapshot();
        });

        it('should insert nested properties for a deep path', () => {
            const node = {
                name: {
                    type: 'String',
                    value: 'sap.ui5',
                    loc: {
                        start: { offset: 18, column: 4 },
                        end: { offset: 19, column: 4 }
                    }
                },
                value: {
                    type: 'Object',
                    members: [{ name: { value: 'existing' } }],
                    loc: {
                        start: { offset: 20, column: 4 },
                        end: { offset: 100, column: 4 }
                    }
                }
            } as MemberNode;

            const deepestPathResult: DeepestExistingPathResult = {
                validatedPath: ['sap.ui5'],
                missingSegments: [
                    'routing',
                    'targets',
                    'IncidentsObjectPage',
                    'options',
                    'settings',
                    'controlConfiguration',
                    'incidentFlow/@com.sap.vocabularies.UI.v1.LineItem',
                    'tableSettings',
                    'creationMode',
                    'name'
                ]
            };

            const fixer = createMockFixer();
            const fixerFn = createJsonFixer({
                context: mockContext,
                node,
                deepestPathResult,
                value: 'NewRow'
            });

            const result = fixerFn!(fixer);

            expect(fixer.insertTextBeforeRange).toHaveBeenCalled();
            // Verify the nested structure is created
            expect(result).toMatchSnapshot();
        });

        it('should handle special characters in property names', () => {
            const node = {
                name: {
                    type: 'String',
                    value: 'config',
                    loc: {
                        start: { offset: 20, column: 4 },
                        end: { offset: 22, column: 4 }
                    }
                },
                value: {
                    type: 'Object',
                    members: [],
                    loc: {
                        start: { offset: 23, column: 4 },
                        end: { offset: 25, column: 4 }
                    }
                }
            } as unknown as MemberNode;

            const deepestPathResult: DeepestExistingPathResult = {
                validatedPath: ['config'],
                missingSegments: ['@odata.context', 'value']
            };

            const fixer = createMockFixer();
            const fixerFn = createJsonFixer({
                context: mockContext,
                node,
                deepestPathResult,
                value: 'test'
            });

            const result = fixerFn!(fixer);

            expect(result).toMatchSnapshot();
        });

        it('should return empty array if node value is not an object', () => {
            const node = {
                value: {
                    type: 'String',
                    value: 'not an object'
                }
            } as MemberNode;

            const deepestPathResult: DeepestExistingPathResult = {
                validatedPath: ['config'],
                missingSegments: ['newProp']
            };

            const fixer = createMockFixer();
            const fixerFn = createJsonFixer({
                context: mockContext,
                node,
                deepestPathResult,
                value: true
            });

            const result = fixerFn!(fixer);

            expect(result).toEqual([]);
            expect(fixer.insertTextBeforeRange).not.toHaveBeenCalled();
        });
    });

    describe('DELETE operation', () => {
        it('should delete a property', () => {
            const node = {
                name: {
                    type: 'String',
                    value: 'obsolete',
                    loc: { start: { offset: 10 }, end: { offset: 20 } }
                },
                value: {
                    type: 'Boolean',
                    value: true,
                    loc: { start: { offset: 23 }, end: { offset: 27 } }
                }
            } as MemberNode;

            const deepestPathResult: DeepestExistingPathResult = {
                validatedPath: ['obsolete'],
                missingSegments: []
            };

            const fixer = createMockFixer();
            const fixerFn = createJsonFixer({
                context: mockContext,
                node,
                deepestPathResult,
                value: undefined,
                operation: 'delete'
            });

            const result = fixerFn!(fixer);

            expect(fixer.removeRange).toHaveBeenCalledWith([10, 27]);
            expect(result).toMatchSnapshot();
        });

        it('should return empty array if node has no name or value', () => {
            const node = {
                name: null,
                value: null
            } as unknown as MemberNode;

            const deepestPathResult: DeepestExistingPathResult = {
                validatedPath: [],
                missingSegments: []
            };

            const fixer = createMockFixer();
            const fixerFn = createJsonFixer({
                context: mockContext,
                node,
                deepestPathResult,
                operation: 'delete'
            });

            const result = fixerFn!(fixer);

            expect(result).toEqual([]);
        });
    });

    describe('Operation inference', () => {
        it('should infer INSERT when missingSegments exist', () => {
            const node = {
                name: {
                    loc: {
                        start: { offset: 20, column: 4 },
                        end: { offset: 22, column: 4 }
                    }
                },
                value: {
                    type: 'Object',
                    members: [],
                    loc: {
                        start: { offset: 23, column: 4 },
                        end: { offset: 25, column: 4 }
                    }
                }
            } as unknown as MemberNode;

            const deepestPathResult: DeepestExistingPathResult = {
                validatedPath: ['config'],
                missingSegments: ['newProp']
            };

            const fixer = createMockFixer();
            const fixerFn = createJsonFixer({
                context: mockContext,
                node,
                deepestPathResult,
                value: 'test'
                // No operation specified - should infer INSERT
            });

            const result = fixerFn!(fixer);

            expect(fixer.insertTextBeforeRange).toHaveBeenCalled();
            expect(result).toMatchSnapshot();
        });

        it('should infer UPDATE when no missingSegments and value is defined', () => {
            const node = {
                value: {
                    type: 'Boolean',
                    range: [10, 14],
                    loc: { start: { offset: 10 }, end: { offset: 14 } }
                }
            } as MemberNode;

            const deepestPathResult: DeepestExistingPathResult = {
                validatedPath: ['enabled'],
                missingSegments: []
            };

            const fixer = createMockFixer();
            const fixerFn = createJsonFixer({
                context: mockContext,
                node,
                deepestPathResult,
                value: true
                // No operation specified - should infer UPDATE
            });

            const result = fixerFn!(fixer);

            expect(fixer.replaceTextRange).toHaveBeenCalled();
            expect(result).toMatchSnapshot();
        });

        it('should infer DELETE when no missingSegments and value is undefined', () => {
            const node = {
                name: {
                    loc: { start: { offset: 10 }, end: { offset: 20 } }
                },
                value: {
                    loc: { start: { offset: 23 }, end: { offset: 27 } }
                }
            } as MemberNode;

            const deepestPathResult: DeepestExistingPathResult = {
                validatedPath: ['obsolete'],
                missingSegments: []
            };

            const fixer = createMockFixer();
            const fixerFn = createJsonFixer({
                context: mockContext,
                node,
                deepestPathResult,
                value: undefined
                // No operation specified - should infer DELETE
            });

            const result = fixerFn!(fixer);

            expect(fixer.removeRange).toHaveBeenCalled();
            expect(result).toMatchSnapshot();
        });
    });

    describe('Error handling', () => {
        it('should handle nodes with missing required properties gracefully', () => {
            // Create a node that will return null (but not throw an error)
            const node = {
                value: null // This will cause handleUpdate to return null
            } as unknown as MemberNode;

            const deepestPathResult: DeepestExistingPathResult = {
                validatedPath: ['test'],
                missingSegments: []
            };

            const fixer = createMockFixer();
            const fixerFn = createJsonFixer({
                context: mockContext,
                node,
                deepestPathResult,
                value: true,
                operation: 'update'
            });

            const result = fixerFn!(fixer);

            // Should return empty array gracefully without throwing
            expect(result).toEqual([]);
        });

        it('should handle insert with non-object node value gracefully', () => {
            const node = {
                value: {
                    type: 'String',
                    value: 'not an object'
                }
            } as MemberNode;

            const deepestPathResult: DeepestExistingPathResult = {
                validatedPath: ['config'],
                missingSegments: ['newProp']
            };

            const fixer = createMockFixer();
            const fixerFn = createJsonFixer({
                context: mockContext,
                node,
                deepestPathResult,
                value: true,
                operation: 'insert'
            });

            const result = fixerFn!(fixer);

            // Should return empty array gracefully
            expect(result).toEqual([]);
        });
    });
});
