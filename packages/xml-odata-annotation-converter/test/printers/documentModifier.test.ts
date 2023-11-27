import type { Element } from '@sap-ux/odata-annotation-core';
import { printOptions } from '@sap-ux/odata-annotation-core';
import type { XMLElement } from '@xml-tools/ast';
import { insert } from '../../src/printer/documentModifier';
import { parse } from './parser';

declare const expect: jest.Expect;

describe('XML document modifier', () => {
    describe('insert', () => {
        test('element -> root', () => {
            const text = `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
    <edmx:DataServices>
            
    <edmx:DataServices>
</edmx:Edmx>`;
            const element: Element = {
                type: 'element',
                name: 'Reference',
                namespaceAlias: 'Edmx',
                content: [
                    {
                        type: 'text',
                        text: ''
                    }
                ],
                attributes: {}
            };
            const { ast } = parse(text);

            const edit = insert(printOptions)(ast.rootElement as XMLElement, element);
            expect(edit).toMatchInlineSnapshot(`
                Object {
                  "newText": "
                    <edmx:Reference></edmx:Reference>",
                  "range": Object {
                    "end": Object {
                      "character": 79,
                      "line": 0,
                    },
                    "start": Object {
                      "character": 79,
                      "line": 0,
                    },
                  },
                }
            `);
        });
        test('element with children -> root', () => {
            const text = `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
    <edmx:DataServices>
            
    <edmx:DataServices>
</edmx:Edmx>`;
            const element: Element = {
                type: 'element',
                name: 'Reference',
                namespaceAlias: 'Edmx',
                content: [
                    {
                        type: 'element',
                        name: 'Include',
                        namespaceAlias: 'Edmx',
                        attributes: {
                            Namespace: {
                                type: 'attribute',
                                name: 'Namespace',
                                value: 'com.some.namespace'
                            },
                            Alias: {
                                type: 'attribute',
                                name: 'Alias',
                                value: 'S'
                            }
                        },
                        content: [
                            {
                                type: 'text',
                                text: ''
                            }
                        ]
                    }
                ],
                attributes: {}
            };
            const { ast } = parse(text);

            const edit = insert(printOptions)(ast.rootElement as XMLElement, element);
            expect(edit).toMatchInlineSnapshot(`
                Object {
                  "newText": "
                    <edmx:Reference>
                        <edmx:Include Namespace=\\"com.some.namespace\\" Alias=\\"S\\"></edmx:Include>
                    </edmx:Reference>",
                  "range": Object {
                    "end": Object {
                      "character": 79,
                      "line": 0,
                    },
                    "start": Object {
                      "character": 79,
                      "line": 0,
                    },
                  },
                }
            `);
        });
    });
});
