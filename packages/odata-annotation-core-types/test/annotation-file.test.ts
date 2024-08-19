import { Range } from '@sap-ux/text-document-utils';

import {
    createTextNode,
    createAttributeNode,
    createElementNode,
    createTarget,
    MultilineType,
    createReference,
    createNamespace
} from '../src/annotation-file';

const edmNamespace = 'http://docs.oasis-open.org/odata/ns/edm';

describe('annotation file', () => {
    describe('create text node', () => {
        test('no ranges', () => {
            expect(createTextNode('some text')).toStrictEqual({
                text: 'some text',
                type: 'text'
            });
        });

        test('with range', () => {
            const text = 'some text';
            expect(createTextNode(text, Range.create(0, 0, 0, text.length))).toStrictEqual({
                range: Range.create(0, 0, 0, text.length),
                text: 'some text',
                type: 'text'
            });
        });

        test('with fragment ranges', () => {
            const text = 'some text';
            const fragments = text.split(' ');
            expect(
                createTextNode(text, Range.create(0, 0, 0, text.length), [
                    Range.create(0, 0, 0, fragments[0].length),
                    Range.create(0, fragments[0].length + 1, 0, text.length)
                ])
            ).toStrictEqual({
                fragmentRanges: [
                    Range.create(0, 0, 0, fragments[0].length),
                    Range.create(0, fragments[0].length + 1, 0, text.length)
                ],
                range: Range.create(0, 0, 0, text.length),
                text: 'some text',
                type: 'text'
            });
        });

        test('with multiline types', () => {
            const text = 'some text';
            const fragments = text.split(' ');
            expect(
                createTextNode(
                    text,
                    Range.create(0, 0, 0, text.length),
                    [
                        Range.create(0, 0, 0, fragments[0].length),
                        Range.create(0, fragments[0].length + 1, 0, text.length)
                    ],
                    MultilineType.KeepIndentation
                )
            ).toStrictEqual({
                fragmentRanges: [
                    Range.create(0, 0, 0, fragments[0].length),
                    Range.create(0, fragments[0].length + 1, 0, text.length)
                ],
                range: Range.create(0, 0, 0, text.length),
                text: 'some text',
                type: 'text',
                multilineType: MultilineType.KeepIndentation
            });
        });
    });

    describe('create attribute node', () => {
        test('without ranges', () => {
            expect(createAttributeNode('key', 'value')).toStrictEqual({
                type: 'attribute',
                name: 'key',
                value: 'value'
            });
        });
        test('with name range', () => {
            const key = 'key';
            const value = 'value';
            expect(createAttributeNode(key, value, Range.create(0, 0, 0, key.length))).toStrictEqual({
                type: 'attribute',
                name: 'key',
                nameRange: Range.create(0, 0, 0, key.length),
                value: 'value'
            });
        });
        test('with name and value range', () => {
            const key = 'key';
            const value = 'value';
            expect(
                createAttributeNode(
                    key,
                    value,
                    Range.create(0, 0, 0, key.length),
                    Range.create(0, key.length, 0, key.length + value.length)
                )
            ).toStrictEqual({
                type: 'attribute',
                name: 'key',
                nameRange: Range.create(0, 0, 0, key.length),
                value: 'value',
                valueRange: Range.create(0, key.length, 0, key.length + value.length)
            });
        });
    });

    describe('create element node', () => {
        test('without ranges', () => {
            expect(createElementNode({ name: 'Node' })).toStrictEqual({
                attributes: {},
                content: [],
                name: 'Node',
                type: 'element'
            });
        });

        test('with range', () => {
            const name = 'Node';
            expect(createElementNode({ name, range: Range.create(0, 0, 0, 10) })).toStrictEqual({
                attributes: {},
                content: [],
                name: 'Node',
                range: Range.create(0, 0, 0, 10),
                type: 'element'
            });
        });

        test('with name range', () => {
            const name = 'Node';
            expect(
                createElementNode({
                    name,
                    range: Range.create(0, 0, 0, 10),
                    nameRange: Range.create(0, 1, 0, name.length)
                })
            ).toStrictEqual({
                attributes: {},
                content: [],
                name: 'Node',
                nameRange: Range.create(0, 1, 0, name.length),
                range: Range.create(0, 0, 0, 10),
                type: 'element'
            });
        });

        test('with content', () => {
            const name = 'Node';
            expect(
                createElementNode({
                    name,
                    range: Range.create(0, 0, 0, 10),
                    nameRange: Range.create(0, 1, 0, name.length),
                    content: [createTextNode('text')]
                })
            ).toStrictEqual({
                attributes: {},
                content: [{ text: 'text', type: 'text' }],
                name: 'Node',
                nameRange: Range.create(0, 1, 0, name.length),
                range: Range.create(0, 0, 0, 10),
                type: 'element'
            });
        });

        test('with content range', () => {
            const name = 'Node';
            expect(
                createElementNode({
                    name,
                    range: Range.create(0, 0, 0, 10),
                    nameRange: Range.create(0, 1, 0, name.length),
                    contentRange: Range.create(0, name.length + 1, 0, 10)
                })
            ).toStrictEqual({
                attributes: {},
                content: [],
                contentRange: Range.create(0, name.length + 1, 0, 10),
                name: 'Node',
                nameRange: Range.create(0, 1, 0, name.length),
                range: Range.create(0, 0, 0, 10),
                type: 'element'
            });
        });

        test('with namespace', () => {
            const name = 'Node';
            expect(
                createElementNode({
                    name,
                    range: Range.create(0, 0, 0, 10),
                    nameRange: Range.create(0, 1, 0, name.length),
                    namespace: edmNamespace
                })
            ).toStrictEqual({
                attributes: {},
                content: [],
                name: 'Node',
                nameRange: Range.create(0, 1, 0, name.length),
                namespace: edmNamespace,
                range: Range.create(0, 0, 0, 10),
                type: 'element'
            });
        });

        test('with namespace and alias', () => {
            const name = 'Node';
            expect(
                createElementNode({
                    name,
                    range: Range.create(0, 0, 0, 10),
                    nameRange: Range.create(0, 1, 0, name.length),
                    namespace: edmNamespace,
                    namespaceAlias: 'Edm'
                })
            ).toStrictEqual({
                attributes: {},
                content: [],
                name: 'Node',
                nameRange: Range.create(0, 1, 0, name.length),
                namespace: edmNamespace,
                namespaceAlias: 'Edm',
                range: Range.create(0, 0, 0, 10),
                type: 'element'
            });
        });

        test('with attributes', () => {
            const name = 'Node';
            expect(
                createElementNode({
                    name,
                    range: Range.create(0, 0, 0, 10),
                    nameRange: Range.create(0, 1, 0, name.length),
                    attributes: {
                        key: createAttributeNode('key', '')
                    }
                })
            ).toStrictEqual({
                attributes: {
                    key: {
                        name: 'key',
                        type: 'attribute',
                        value: ''
                    }
                },
                content: [],
                name: 'Node',
                nameRange: Range.create(0, 1, 0, name.length),
                range: Range.create(0, 0, 0, 10),
                type: 'element'
            });
        });
    });

    describe('create target', () => {
        const result = createTarget('target/path');
        expect(result).toMatchInlineSnapshot(`
            Object {
              "name": "target/path",
              "nameRange": undefined,
              "range": undefined,
              "terms": Array [],
              "termsRange": undefined,
              "type": "target",
            }
        `);
    });

    describe('create reference', () => {
        const result = createReference('reference.name', 'testRef', 'test/uri', {
            range: Range.create(0, 0, 2, 0),
            nameRange: Range.create(0, 1, 0, 10),
            aliasRange: Range.create(1, 0, 1, 5),
            uriRange: Range.create(2, 0, 2, 50)
        });
        expect(result).toMatchInlineSnapshot(`
            Object {
              "alias": "testRef",
              "aliasRange": Object {
                "end": Object {
                  "character": 5,
                  "line": 1,
                },
                "start": Object {
                  "character": 0,
                  "line": 1,
                },
              },
              "name": "reference.name",
              "nameRange": Object {
                "end": Object {
                  "character": 10,
                  "line": 0,
                },
                "start": Object {
                  "character": 1,
                  "line": 0,
                },
              },
              "range": Object {
                "end": Object {
                  "character": 0,
                  "line": 2,
                },
                "start": Object {
                  "character": 0,
                  "line": 0,
                },
              },
              "type": "reference",
              "uri": "test/uri",
              "uriRange": Object {
                "end": Object {
                  "character": 50,
                  "line": 2,
                },
                "start": Object {
                  "character": 0,
                  "line": 2,
                },
              },
            }
        `);
    });

    describe('create namespace', () => {
        const result = createNamespace('namespace.name', 'testNS', {
            range: Range.create(0, 0, 2, 0),
            nameRange: Range.create(0, 1, 0, 10),
            aliasRange: Range.create(1, 0, 1, 5),
            contentRange: Range.create(2, 0, 2, 50)
        });
        expect(result).toMatchInlineSnapshot(`
            Object {
              "alias": "testNS",
              "aliasRange": Object {
                "end": Object {
                  "character": 5,
                  "line": 1,
                },
                "start": Object {
                  "character": 0,
                  "line": 1,
                },
              },
              "contentRange": Object {
                "end": Object {
                  "character": 50,
                  "line": 2,
                },
                "start": Object {
                  "character": 0,
                  "line": 2,
                },
              },
              "name": "namespace.name",
              "nameRange": Object {
                "end": Object {
                  "character": 10,
                  "line": 0,
                },
                "start": Object {
                  "character": 1,
                  "line": 0,
                },
              },
              "range": Object {
                "end": Object {
                  "character": 0,
                  "line": 2,
                },
                "start": Object {
                  "character": 0,
                  "line": 0,
                },
              },
              "type": "namespace",
            }
        `);
    });
});
