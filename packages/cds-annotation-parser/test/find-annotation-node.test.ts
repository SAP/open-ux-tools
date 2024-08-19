import { Position } from '@sap-ux/odata-annotation-core';

import { parse } from '../src';
import { findAnnotationNode, getNode, getAstNodes } from '../src/find-annotation-node';
import { getAst } from './utils';

declare const expect: jest.Expect;

describe('context resolver', () => {
    describe('invalid/vocabulary-group', () => {
        describe('basic', () => {
            test('in group identifier', async () => {
                const ast = await getAst('invalid/vocabulary-group');
                const path = findAnnotationNode(ast, {
                    position: Position.create(0, 0),
                    includeDelimiterCharacters: false
                });
                expect(path).toStrictEqual('/name');
            });
            test('in group body after element', async () => {
                const ast = await getAst('invalid/vocabulary-group');
                const path = findAnnotationNode(ast, {
                    position: Position.create(0, 6),
                    includeDelimiterCharacters: false
                });
                expect(path).toStrictEqual('/items');
            });
            test('term identifier', async () => {
                const ast = await getAst('invalid/vocabulary-group');
                const path = findAnnotationNode(ast, {
                    position: Position.create(1, 5),
                    includeDelimiterCharacters: false
                });
                expect(path).toStrictEqual('/items/items/0/term');
            });
            test('record content', async () => {
                const ast = await getAst('invalid/vocabulary-group');
                const path = findAnnotationNode(ast, {
                    position: Position.create(1, 20),
                    includeDelimiterCharacters: false
                });
                expect(path).toStrictEqual('/items/items/0/value');
            });
            test('record property', async () => {
                const ast = await getAst('invalid/vocabulary-group');
                const path = findAnnotationNode(ast, {
                    position: Position.create(1, 32),
                    includeDelimiterCharacters: false
                });
                expect(path).toStrictEqual('/items/items/0/value/properties/0');
            });
            test('record annotation', async () => {
                const ast = await getAst('invalid/vocabulary-group');
                const path = findAnnotationNode(ast, {
                    position: Position.create(15, 36),
                    includeDelimiterCharacters: false
                });
                expect(path).toStrictEqual('/items/items/2/value/items/0');
            });
            test('record property name', async () => {
                const ast = await getAst('invalid/vocabulary-group');
                const path = findAnnotationNode(ast, {
                    position: Position.create(1, 22),
                    includeDelimiterCharacters: false
                });
                expect(path).toStrictEqual('/items/items/0/value/properties/0/name');
            });
            test('record property value', async () => {
                const ast = await getAst('invalid/vocabulary-group');
                const path = findAnnotationNode(ast, {
                    position: Position.create(1, 35),
                    includeDelimiterCharacters: false
                });
                expect(path).toStrictEqual('/items/items/0/value/properties/0/value');
            });
            test('collection content', async () => {
                const ast = await getAst('invalid/vocabulary-group');
                const path = findAnnotationNode(ast, {
                    position: Position.create(13, 0),
                    includeDelimiterCharacters: false
                });
                expect(path).toStrictEqual('/items/items/2/value');
            });
            test('collection item content', async () => {
                const ast = await getAst('invalid/vocabulary-group');
                const path = findAnnotationNode(ast, {
                    position: Position.create(13, 5),
                    includeDelimiterCharacters: false
                });
                expect(path).toStrictEqual('/items/items/2/value/items/0');
            });
        });
        describe('borders without delimiters', () => {
            describe('collection', () => {
                test('before [', async () => {
                    const ast = await getAst('invalid/vocabulary-group');
                    const path = findAnnotationNode(ast, {
                        position: Position.create(12, 19),
                        includeDelimiterCharacters: false
                    });
                    expect(path).toStrictEqual('/items/items/2');
                });
                test('after [', async () => {
                    const ast = await getAst('invalid/vocabulary-group');
                    const path = findAnnotationNode(ast, {
                        position: Position.create(12, 20),
                        includeDelimiterCharacters: false
                    });
                    expect(path).toStrictEqual('/items/items/2/value');
                });
                test('before ]', async () => {
                    const ast = await getAst('invalid/vocabulary-group');
                    const path = findAnnotationNode(ast, {
                        position: Position.create(20, 4),
                        includeDelimiterCharacters: false
                    });
                    expect(path).toStrictEqual('/items/items/2/value');
                });
                test('after ]', async () => {
                    const ast = await getAst('invalid/vocabulary-group');
                    const path = findAnnotationNode(ast, {
                        position: Position.create(20, 5),
                        includeDelimiterCharacters: false
                    });
                    expect(path).toStrictEqual('/items/items/2');
                });
            });
            describe('record', () => {
                test('before {', async () => {
                    const ast = await getAst('invalid/vocabulary-group');
                    const path = findAnnotationNode(ast, {
                        position: Position.create(1, 19),
                        includeDelimiterCharacters: false
                    });
                    expect(path).toStrictEqual('/items/items/0');
                });
                test('after {', async () => {
                    const ast = await getAst('invalid/vocabulary-group');
                    const path = findAnnotationNode(ast, {
                        position: Position.create(1, 20),
                        includeDelimiterCharacters: false
                    });
                    expect(path).toStrictEqual('/items/items/0/value');
                });
                test('before }', async () => {
                    const ast = await getAst('invalid/vocabulary-group');
                    const path = findAnnotationNode(ast, {
                        position: Position.create(1, 41),
                        includeDelimiterCharacters: false
                    });
                    expect(path).toStrictEqual('/items/items/0/value');
                });
                test('after }', async () => {
                    const ast = await getAst('invalid/vocabulary-group');
                    const path = findAnnotationNode(ast, {
                        position: Position.create(1, 42),
                        includeDelimiterCharacters: false
                    });
                    expect(path).toStrictEqual('/items/items/0');
                });
            });
            describe('string', () => {
                test('before open', async () => {
                    const ast = await getAst('invalid/vocabulary-group');
                    const path = findAnnotationNode(ast, {
                        position: Position.create(4, 17),
                        includeDelimiterCharacters: false
                    });
                    expect(path).toStrictEqual('/items/items/1/value/items/0/properties/0');
                });
                test('after open', async () => {
                    const ast = await getAst('invalid/vocabulary-group');
                    const path = findAnnotationNode(ast, {
                        position: Position.create(4, 18),
                        includeDelimiterCharacters: false
                    });
                    expect(path).toStrictEqual('/items/items/1/value/items/0/properties/0/value');
                });
                test('before close', async () => {
                    const ast = await getAst('invalid/vocabulary-group');
                    const path = findAnnotationNode(ast, {
                        position: Position.create(4, 35),
                        includeDelimiterCharacters: false
                    });
                    expect(path).toStrictEqual('/items/items/1/value/items/0/properties/0/value');
                });
                test('after close', async () => {
                    const ast = await getAst('invalid/vocabulary-group');
                    const path = findAnnotationNode(ast, {
                        position: Position.create(4, 36),
                        includeDelimiterCharacters: false
                    });
                    expect(path).toStrictEqual('/items/items/1/value/items/0/properties/0');
                });
            });
            describe('empty string', () => {
                test('before open', async () => {
                    const ast = await getAst('invalid/vocabulary-group');
                    const path = findAnnotationNode(ast, {
                        position: Position.create(24, 25),
                        includeDelimiterCharacters: false
                    });
                    expect(path).toStrictEqual('/items/items/3/value/properties/2');
                });
                test('content', async () => {
                    const ast = await getAst('invalid/vocabulary-group');
                    const path = findAnnotationNode(ast, {
                        position: Position.create(24, 26),
                        includeDelimiterCharacters: false
                    });
                    expect(path).toStrictEqual('/items/items/3/value/properties/2/value');
                });
                test('after close', async () => {
                    const ast = await getAst('invalid/vocabulary-group');
                    const path = findAnnotationNode(ast, {
                        position: Position.create(24, 27),
                        includeDelimiterCharacters: false
                    });
                    expect(path).toStrictEqual('/items/items/3/value/properties/2');
                });
            });
        });
        describe('borders with delimiters', () => {
            describe('collection', () => {
                test('before [', async () => {
                    const ast = await getAst('invalid/vocabulary-group');
                    const path = findAnnotationNode(ast, {
                        position: Position.create(12, 19),
                        includeDelimiterCharacters: true
                    });
                    expect(path).toStrictEqual('/items/items/2/value');
                });
                test('after [', async () => {
                    const ast = await getAst('invalid/vocabulary-group');
                    const path = findAnnotationNode(ast, {
                        position: Position.create(12, 20),
                        includeDelimiterCharacters: true
                    });
                    expect(path).toStrictEqual('/items/items/2/value');
                });
                test('before ]', async () => {
                    const ast = await getAst('invalid/vocabulary-group');
                    const path = findAnnotationNode(ast, {
                        position: Position.create(20, 4),
                        includeDelimiterCharacters: true
                    });
                    expect(path).toStrictEqual('/items/items/2/value');
                });
                test('after ]', async () => {
                    const ast = await getAst('invalid/vocabulary-group');
                    const path = findAnnotationNode(ast, {
                        position: Position.create(20, 5),
                        includeDelimiterCharacters: true
                    });
                    expect(path).toStrictEqual('/items/items/2/value');
                });
            });
            describe('record', () => {
                test('before {', async () => {
                    const ast = await getAst('invalid/vocabulary-group');
                    const path = findAnnotationNode(ast, {
                        position: Position.create(1, 19),
                        includeDelimiterCharacters: true
                    });
                    expect(path).toStrictEqual('/items/items/0/value');
                });
                test('after {', async () => {
                    const ast = await getAst('invalid/vocabulary-group');
                    const path = findAnnotationNode(ast, {
                        position: Position.create(1, 20),
                        includeDelimiterCharacters: true
                    });
                    expect(path).toStrictEqual('/items/items/0/value');
                });
                test('before }', async () => {
                    const ast = await getAst('invalid/vocabulary-group');
                    const path = findAnnotationNode(ast, {
                        position: Position.create(1, 41),
                        includeDelimiterCharacters: true
                    });
                    expect(path).toStrictEqual('/items/items/0/value');
                });
                test('after }', async () => {
                    const ast = await getAst('invalid/vocabulary-group');
                    const path = findAnnotationNode(ast, {
                        position: Position.create(1, 42),
                        includeDelimiterCharacters: true
                    });
                    expect(path).toStrictEqual('/items/items/0/value');
                });
            });
            describe('string', () => {
                test('before open', async () => {
                    const ast = await getAst('invalid/vocabulary-group');
                    const path = findAnnotationNode(ast, {
                        position: Position.create(4, 18),
                        includeDelimiterCharacters: true
                    });
                    expect(path).toStrictEqual('/items/items/1/value/items/0/properties/0/value');
                });
                test('after open', async () => {
                    const ast = await getAst('invalid/vocabulary-group');
                    const path = findAnnotationNode(ast, {
                        position: Position.create(4, 19),
                        includeDelimiterCharacters: true
                    });
                    expect(path).toStrictEqual('/items/items/1/value/items/0/properties/0/value');
                });
                test('before close', async () => {
                    const ast = await getAst('invalid/vocabulary-group');
                    const path = findAnnotationNode(ast, {
                        position: Position.create(4, 35),
                        includeDelimiterCharacters: true
                    });
                    expect(path).toStrictEqual('/items/items/1/value/items/0/properties/0/value');
                });
                test('after close', async () => {
                    const ast = await getAst('invalid/vocabulary-group');
                    const path = findAnnotationNode(ast, {
                        position: Position.create(4, 36),
                        includeDelimiterCharacters: true
                    });
                    expect(path).toStrictEqual('/items/items/1/value/items/0/properties/0/value');
                });
            });
            describe('empty string', () => {
                test('before open', async () => {
                    const ast = await getAst('invalid/vocabulary-group');
                    const path = findAnnotationNode(ast, {
                        position: Position.create(24, 25),
                        includeDelimiterCharacters: true
                    });
                    expect(path).toStrictEqual('/items/items/3/value/properties/2/value');
                });
                test('content', async () => {
                    const ast = await getAst('invalid/vocabulary-group');
                    const path = findAnnotationNode(ast, {
                        position: Position.create(24, 26),
                        includeDelimiterCharacters: true
                    });
                    expect(path).toStrictEqual('/items/items/3/value/properties/2/value');
                });
                test('after close', async () => {
                    const ast = await getAst('invalid/vocabulary-group');
                    const path = findAnnotationNode(ast, {
                        position: Position.create(24, 27),
                        includeDelimiterCharacters: true
                    });
                    expect(path).toStrictEqual('/items/items/3/value/properties/2/value');
                });
            });
        });
    });
    describe('valid/qualifier/annotation', () => {
        describe('basic', () => {
            test('term', async () => {
                const ast = await getAst('valid/qualifier/annotation');
                const path = findAnnotationNode(ast, {
                    position: Position.create(0, 0),
                    includeDelimiterCharacters: false
                });
                expect(path).toStrictEqual('/term');
            });
        });
    });
    describe('invalid/bracket-matching', () => {
        test('term', async () => {
            const ast = await getAst('invalid/bracket-matching');
            const path = findAnnotationNode(ast, {
                position: Position.create(2, 10),
                includeDelimiterCharacters: false
            });
            expect(path).toStrictEqual('/items/items/1/term');
        });
    });
    describe('invalid corner cases', () => {
        test('cut off value', () => {
            const ast = parse(`UI : {
    SelectionFields: [],
    Fields`);
            const path = findAnnotationNode(ast, {
                position: Position.create(2, 10),
                includeDelimiterCharacters: false
            });
            expect(path).toStrictEqual('/items/items/1/term');
        });
    });
    describe('string', () => {
        test('string value in collection', () => {
            const ast = parse(`Common: {
                SideEffects  : {
                    $Type : 'Common.SideEffectsType',
                    TargetProperties : [
                        'category/*',
                    ],
                }
            }`);
            const path = findAnnotationNode(ast, {
                position: Position.create(4, 28),
                includeDelimiterCharacters: false
            });
            expect(path).toStrictEqual('/items/items/0/value/properties/1/value/items/0');
        });
    });
});

describe('getNode', () => {
    test('object node', () => {
        const assignment: any = {
            a: {
                d: 4
            },
            b: {
                type: 'node b',
                e: {
                    type: 'node e',
                    f: {
                        g: 7
                    }
                }
            },
            c: {}
        };
        const path = '/b/e';

        const result = getNode(assignment, path);

        expect(result).toEqual(assignment.b.e);
    });

    test('array node', () => {
        const assignment: any = {
            a: {
                d: 4
            },
            b: {
                type: 'node b',
                e: []
            },
            c: {}
        };
        const path = '/b/e';

        const result = getNode(assignment, path);

        expect(result).toEqual(assignment.b.e);
    });

    test('scalar node', () => {
        const assignment: any = {
            a: {
                d: 4
            },
            b: {
                type: 'node b',
                e: 'test'
            },
            c: {}
        };
        const path = '/b/e';

        const result = getNode(assignment, path);

        expect(result).toBeUndefined();
    });

    test('node without type in the path', () => {
        const assignment: any = {
            a: {
                d: 4
            },
            b: {
                e: {
                    type: 'e',
                    f: 1
                }
            },
            c: {}
        };
        const path = '/b/e';

        const result = getNode(assignment, path);

        expect(result).toBeUndefined();
    });

    test('path does not exist', () => {
        const assignment: any = {
            a: {
                d: 4
            },
            c: {}
        };
        const path = '/b/e';

        const result = getNode(assignment, path);

        expect(result).toBeUndefined();
    });
});

describe('getNodes', () => {
    test('object node', () => {
        const assignment: any = {
            a: {
                d: 4
            },
            b: {
                type: 'node b',
                e: {
                    type: 'node e',
                    f: {
                        g: 7
                    }
                }
            },
            c: {}
        };
        const path = '/b/e';

        const result = getAstNodes(assignment, path);

        expect(result).toEqual([assignment.b, assignment.b.e]);
    });

    test('array node', () => {
        const assignment: any = {
            a: {
                d: 4
            },
            b: {
                type: 'node b',
                e: []
            },
            c: {}
        };
        const path = '/b/e';

        const result = getAstNodes(assignment, path);

        expect(result).toEqual([assignment.b, assignment.b.e]);
    });

    test('scalar node', () => {
        const assignment: any = {
            a: {
                d: 4
            },
            b: {
                type: 'node b',
                e: 'test'
            },
            c: {}
        };
        const path = '/b/e';

        const result = getAstNodes(assignment, path);

        expect(result).toBeUndefined();
    });

    test('path does not exist', () => {
        const assignment: any = {
            a: {
                d: 4
            },
            b: {
                type: 'node b'
            },
            c: {}
        };
        const path = '/b/e';

        const result = getAstNodes(assignment, path);

        expect(result).toBeUndefined();
    });
});
