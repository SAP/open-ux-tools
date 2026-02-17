import type { DocumentNode, MemberNode } from '@humanwhocodes/momoa';
import { parse } from '@humanwhocodes/momoa';
import type { JSONRuleContext } from '../../src/language/rule-factory';
import { createJsonFixer } from '../../src/language/rule-fixer';
import type { DeepestExistingPathResult } from '../../src/utils/helpers';

/**
 * Helper function to create a MemberNode from JSON text and a property path.
 * Parses the JSON and finds the node at the specified path.
 *
 * @param jsonText - The JSON text to parse
 * @param path - Array of property names to navigate to the target node
 * @returns The MemberNode and AST at the specified path
 * @throws {Error} If the JSON structure is invalid or the path is not found
 */
function createNodeFromJson(jsonText: string, path: string[]): { node: MemberNode; ast: DocumentNode } {
    const ast = parse(jsonText);

    if (ast.type !== 'Document' || ast.body.type !== 'Object') {
        throw new Error('Invalid JSON structure');
    }

    let currentNode: MemberNode | undefined;
    let members = ast.body.members;

    for (const segment of path) {
        currentNode = members?.find((member) => {
            const name = member.name;
            return name.type === 'String' && name.value === segment;
        });
        if (!currentNode) {
            throw new Error(`Property "${segment}" not found in path`);
        }
        if (currentNode.value.type === 'Object') {
            members = currentNode.value.members;
        }
    }

    if (!currentNode) {
        throw new Error('No node found');
    }

    return { node: currentNode, ast };
}
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
        node,
        range: [0, 0] as [number, number],
        text
    }))
});

describe('createJsonFixer', () => {
    // Mock context
    const mockContext = {
        sourceCode: {},
        report: jest.fn()
    } as unknown as JSONRuleContext<string, unknown[]>;

    describe('UPDATE operation', () => {
        it('should update a boolean value', () => {
            const sourceText = `{"sap.ui5": {"flexEnabled": false}}`;
            const { node, ast } = createNodeFromJson(sourceText, ['sap.ui5', 'flexEnabled']);
            const mockContextWithText = {
                sourceCode: { text: sourceText, ast: { body: ast.body } },
                report: jest.fn()
            } as unknown as JSONRuleContext<string, unknown[]>;

            const deepestPathResult: DeepestExistingPathResult = {
                validatedPath: ['sap.ui5', 'flexEnabled'],
                missingSegments: []
            };

            const fixer = createMockFixer();
            const fixerFn = createJsonFixer({
                context: mockContextWithText,
                node,
                deepestPathResult,
                value: true
            });

            const result = fixerFn!(fixer);

            expect(fixer.replaceTextRange).toHaveBeenCalled();
            expect(result).toMatchSnapshot();
        });

        it('should update a string value', () => {
            const sourceText = `{"title": "Old Title"}`;
            const { node, ast } = createNodeFromJson(sourceText, ['title']);
            const mockContextWithText = {
                sourceCode: { text: sourceText, ast: { body: ast.body } },
                report: jest.fn()
            } as unknown as JSONRuleContext<string, unknown[]>;

            const deepestPathResult: DeepestExistingPathResult = {
                validatedPath: ['title'],
                missingSegments: []
            };

            const fixer = createMockFixer();
            const fixerFn = createJsonFixer({
                context: mockContextWithText,
                node,
                deepestPathResult,
                value: 'New Title'
            });

            const result = fixerFn!(fixer);

            expect(fixer.replaceTextRange).toHaveBeenCalled();
            expect(result).toMatchSnapshot();
        });

        it('should update a number value', () => {
            const sourceText = `{"count": 42}`;
            const { node, ast } = createNodeFromJson(sourceText, ['count']);
            const mockContextWithText = {
                sourceCode: { text: sourceText, ast: { body: ast.body } },
                report: jest.fn()
            } as unknown as JSONRuleContext<string, unknown[]>;

            const deepestPathResult: DeepestExistingPathResult = {
                validatedPath: ['count'],
                missingSegments: []
            };

            const fixer = createMockFixer();
            const fixerFn = createJsonFixer({
                context: mockContextWithText,
                node,
                deepestPathResult,
                value: 100
            });

            const result = fixerFn!(fixer);

            expect(fixer.replaceTextRange).toHaveBeenCalled();
            expect(result).toMatchSnapshot();
        });

        it('should update an object value', () => {
            const sourceText = `{"config": {"old": true}}`;
            const { node, ast } = createNodeFromJson(sourceText, ['config']);
            const mockContextWithText = {
                sourceCode: { text: sourceText, ast: { body: ast.body } },
                report: jest.fn()
            } as unknown as JSONRuleContext<string, unknown[]>;

            const deepestPathResult: DeepestExistingPathResult = {
                validatedPath: ['config'],
                missingSegments: []
            };

            const fixer = createMockFixer();
            const fixerFn = createJsonFixer({
                context: mockContextWithText,
                node,
                deepestPathResult,
                value: { enabled: true, count: 5 }
            });

            const result = fixerFn!(fixer);

            expect(fixer.replaceTextRange).toHaveBeenCalled();
            expect(result).toMatchSnapshot();
        });

        it('should update the value for a parent node - fixParent = true', () => {
            const sourceText = `{"parent": {"old": true}}`;
            const { node, ast } = createNodeFromJson(sourceText, ['parent']);
            const mockContextWithText = {
                sourceCode: {
                    getParent: jest
                        .fn()
                        .mockReturnValueOnce({ name: 'parent', type: 'Object', members: [{}] })
                        .mockReturnValueOnce({ name: 'parent', type: 'Member', value: { range: [0, 1] } }),
                    text: sourceText,
                    ast: { body: ast.body }
                },
                report: jest.fn()
            } as unknown as JSONRuleContext<string, unknown[]>;

            const deepestPathResult: DeepestExistingPathResult = {
                validatedPath: ['parent', 'old'],
                missingSegments: []
            };

            const fixer = createMockFixer();
            const fixerFn = createJsonFixer({
                context: mockContextWithText,
                node,
                deepestPathResult,
                value: false,
                fixParent: true
            });

            const result = fixerFn!(fixer);

            expect(fixer.replaceTextRange).toHaveBeenCalled();
            expect(result).toMatchSnapshot();
        });
    });

    describe('INSERT operation', () => {
        it('should insert a new property into an empty object', () => {
            const sourceText = `{"sap.ui5": {}}`;
            const { node, ast } = createNodeFromJson(sourceText, ['sap.ui5']);
            const mockContextWithText = {
                sourceCode: { text: sourceText, ast: { body: ast.body } },
                report: jest.fn()
            } as unknown as JSONRuleContext<string, unknown[]>;

            const deepestPathResult: DeepestExistingPathResult = {
                validatedPath: ['sap.ui5'],
                missingSegments: ['flexEnabled']
            };

            const fixer = createMockFixer();
            const fixerFn = createJsonFixer({
                context: mockContextWithText,
                node,
                deepestPathResult,
                value: true
            });

            const result = fixerFn!(fixer);

            expect(fixer.insertTextBeforeRange).toHaveBeenCalled();
            expect(result).toMatchSnapshot();
        });

        it('should insert nested properties for a deep path', () => {
            const sourceText = `{"sap.ui5": {"existing": true}}`;
            const { node, ast } = createNodeFromJson(sourceText, ['sap.ui5']);
            const mockContextWithText = {
                sourceCode: { text: sourceText, ast: { body: ast.body } },
                report: jest.fn()
            } as unknown as JSONRuleContext<string, unknown[]>;

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
                context: mockContextWithText,
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
            const sourceText = `{"config": {}}`;
            const { node, ast } = createNodeFromJson(sourceText, ['config']);
            const mockContextWithText = {
                sourceCode: { text: sourceText, ast: { body: ast.body } },
                report: jest.fn()
            } as unknown as JSONRuleContext<string, unknown[]>;

            const deepestPathResult: DeepestExistingPathResult = {
                validatedPath: ['config'],
                missingSegments: ['@odata.context', 'value']
            };

            const fixer = createMockFixer();
            const fixerFn = createJsonFixer({
                context: mockContextWithText,
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

        it('should insert value on a parent node - fixParent = true', () => {
            const sourceText = `{"parent": {"old": true}}`;
            const { node, ast } = createNodeFromJson(sourceText, ['parent']);
            const mockContextWithText = {
                sourceCode: {
                    getParent: jest
                        .fn()
                        .mockReturnValueOnce({ name: 'parent', type: 'Object', members: [{}] })
                        .mockReturnValueOnce({
                            name: { loc: { start: { column: 1 } } },
                            type: 'Member',
                            value: { type: 'Object', range: [2, 3], loc: { start: { offset: 400 } }, members: [] }
                        }),
                    text: sourceText,
                    ast: { body: ast.body }
                },
                report: jest.fn()
            } as unknown as JSONRuleContext<string, unknown[]>;

            const deepestPathResult: DeepestExistingPathResult = {
                validatedPath: ['parent', 'old'],
                missingSegments: ['newProp']
            };

            const fixer = createMockFixer();
            const fixerFn = createJsonFixer({
                context: mockContextWithText,
                node,
                deepestPathResult,
                value: false,
                operation: 'insert',
                fixParent: true
            });

            const result = fixerFn!(fixer);

            expect(fixer.insertTextBeforeRange).toHaveBeenCalled();
            expect(result).toMatchSnapshot();
        });
    });

    describe('DELETE operation', () => {
        it('should delete a property with trailing comma', () => {
            const sourceText = `{
                "name": "John",
                "age": 30
            }`;
            const { node, ast } = createNodeFromJson(sourceText, ['name']);
            const mockContextWithText = {
                sourceCode: { text: sourceText, ast: { body: ast.body } },
                report: jest.fn()
            } as unknown as JSONRuleContext<string, unknown[]>;

            const deepestPathResult: DeepestExistingPathResult = {
                validatedPath: ['name'],
                missingSegments: []
            };

            const fixer = createMockFixer();
            const fixerFn = createJsonFixer({
                context: mockContextWithText,
                node,
                deepestPathResult,
                value: undefined,
                operation: 'delete'
            });

            const result = fixerFn!(fixer);

            expect(fixer.removeRange).toHaveBeenCalled();
            expect(result).toMatchSnapshot();
        });

        it('should replace a single property in an object node', () => {
            const sourceText = `{
                "tableSettings": {
                    "copy": false
                }
            }`;
            const { node, ast } = createNodeFromJson(sourceText, ['tableSettings', 'copy']);
            const mockContextWithText = {
                sourceCode: { text: sourceText, ast: { body: ast.body } },
                report: jest.fn()
            } as unknown as JSONRuleContext<string, unknown[]>;

            const deepestPathResult: DeepestExistingPathResult = {
                validatedPath: ['tableSettings', 'copy'],
                missingSegments: []
            };

            const fixer = createMockFixer();
            const fixerFn = createJsonFixer({
                context: mockContextWithText,
                node,
                deepestPathResult,
                operation: 'delete'
            });

            const result = fixerFn!(fixer);

            expect(fixer.replaceText).toHaveBeenCalled();
            expect(result).toMatchSnapshot();
        });

        it('should delete a deeply nested object property with preceding comma if this is last property', () => {
            // we should delete the preceding comma in this case
            const sourceText = `{
                "tableSettings": {
                    "shouldStay": true,
                    "creationMode": {
                        "name": "InlineCreationRows",
                        "createAtEnd": true
                    }
                },
                "type": "AnalyticalTable"
            }`;
            const { node, ast } = createNodeFromJson(sourceText, ['tableSettings', 'creationMode']);
            const mockContextWithText = {
                sourceCode: { text: sourceText, ast: { body: ast.body } },
                report: jest.fn()
            } as unknown as JSONRuleContext<string, unknown[]>;

            const deepestPathResult: DeepestExistingPathResult = {
                validatedPath: ['tableSettings', 'creationMode'],
                missingSegments: []
            };

            const fixer = createMockFixer();
            const fixerFn = createJsonFixer({
                context: mockContextWithText,
                node,
                deepestPathResult,
                value: undefined,
                operation: 'delete'
            });

            const result = fixerFn!(fixer);

            expect(fixer.removeRange).toHaveBeenCalled();
            expect(result).toMatchSnapshot();
        });
        it('should delete a deeply nested object property with preceding comma', () => {
            const sourceText = `{
                "tableSettings": {
                    "type": "AnalyticalTable",
                    "creationMode": {
                        "name": "InlineCreationRows",
                        "createAtEnd": true
                    }
                }
            }`;
            const { node, ast } = createNodeFromJson(sourceText, ['tableSettings', 'creationMode']);
            const mockContextWithText = {
                sourceCode: { text: sourceText, ast: { body: ast.body } },
                report: jest.fn()
            } as unknown as JSONRuleContext<string, unknown[]>;

            const deepestPathResult: DeepestExistingPathResult = {
                validatedPath: ['tableSettings', 'creationMode'],
                missingSegments: []
            };

            const fixer = createMockFixer();
            const fixerFn = createJsonFixer({
                context: mockContextWithText,
                node,
                deepestPathResult,
                value: undefined,
                operation: 'delete'
            });

            const result = fixerFn!(fixer);

            expect(fixer.removeRange).toHaveBeenCalled();
            expect(result).toMatchSnapshot();
        });

        it('should return empty array if node has no name or value', () => {
            const mockContextWithText = {
                sourceCode: { text: '{}' },
                report: jest.fn()
            } as unknown as JSONRuleContext<string, unknown[]>;

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
                context: mockContextWithText,
                node,
                deepestPathResult,
                operation: 'delete'
            });

            const result = fixerFn!(fixer);

            expect(result).toEqual([]);
        });

        it('should delete parent object value if fixParent = true', () => {
            const sourceText = `{"parent": {"old": true}}`;
            const { node, ast } = createNodeFromJson(sourceText, ['parent']);
            const mockContextWithText = {
                sourceCode: {
                    getParent: jest
                        .fn()
                        .mockReturnValueOnce({ name: 'parent', type: 'Object', members: [{}] })
                        .mockReturnValueOnce({
                            name: { loc: { start: { offset: 3 } } },
                            type: 'Member',
                            value: { loc: { end: { offset: 4 } } }
                        }),
                    text: sourceText,
                    ast: { body: ast.body }
                },
                report: jest.fn()
            } as unknown as JSONRuleContext<string, unknown[]>;

            const deepestPathResult: DeepestExistingPathResult = {
                validatedPath: ['parent', 'old'],
                missingSegments: []
            };

            const fixer = createMockFixer();
            const fixerFn = createJsonFixer({
                context: mockContextWithText,
                node,
                deepestPathResult,
                operation: 'delete',
                fixParent: true
            });

            const result = fixerFn!(fixer);

            expect(fixer.removeRange).toHaveBeenCalled();
            expect(result).toMatchSnapshot();
        });
    });

    describe('Operation inference', () => {
        it('should infer INSERT when missingSegments exist', () => {
            const sourceText = `{"config": {}}`;
            const { node, ast } = createNodeFromJson(sourceText, ['config']);
            const mockContextWithText = {
                sourceCode: { text: sourceText, ast: { body: ast.body } },
                report: jest.fn()
            } as unknown as JSONRuleContext<string, unknown[]>;

            const deepestPathResult: DeepestExistingPathResult = {
                validatedPath: ['config'],
                missingSegments: ['newProp']
            };

            const fixer = createMockFixer();
            const fixerFn = createJsonFixer({
                context: mockContextWithText,
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
            const sourceText = `{"enabled": false}`;
            const { node, ast } = createNodeFromJson(sourceText, ['enabled']);
            const mockContextWithText = {
                sourceCode: { text: sourceText, ast: { body: ast.body } },
                report: jest.fn()
            } as unknown as JSONRuleContext<string, unknown[]>;

            const deepestPathResult: DeepestExistingPathResult = {
                validatedPath: ['enabled'],
                missingSegments: []
            };

            const fixer = createMockFixer();
            const fixerFn = createJsonFixer({
                context: mockContextWithText,
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
            const sourceText = '{"obsolete": true, "anotherNode": "test"}';
            const { node, ast } = createNodeFromJson(sourceText, ['obsolete']);
            const mockContextWithText = {
                sourceCode: { text: sourceText, ast: { body: ast.body } },
                report: jest.fn()
            } as unknown as JSONRuleContext<string, unknown[]>;

            const deepestPathResult: DeepestExistingPathResult = {
                validatedPath: ['obsolete'],
                missingSegments: []
            };

            const fixer = createMockFixer();
            const fixerFn = createJsonFixer({
                context: mockContextWithText,
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
