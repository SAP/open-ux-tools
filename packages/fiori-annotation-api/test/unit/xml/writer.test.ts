import { TextDocument } from 'vscode-languageserver-textdocument';

import type { XMLDocument } from '@xml-tools/ast';
import { buildAst } from '@xml-tools/ast';
import type { DocumentCstNode } from '@xml-tools/parser';
import { parse } from '@xml-tools/parser';
import {
    TextEdit,
    Range,
    Position,
    createElementNode,
    createTextNode,
    createAttributeNode
} from '@sap-ux/odata-annotation-core-types';

import type { InsertElement, UpdateElementName, XMLDocumentChange } from '../../../src/xml/changes';
import {
    REPLACE_ELEMENT_CONTENT,
    insertElement,
    UPDATE_ATTRIBUTE_NAME,
    MOVE_COLLECTION_VALUE
} from '../../../src/xml/changes';
import { XMLWriter } from '../../../src/xml/writer';

import { applyTextEdits } from '../apply-edits';
import type { Comment } from '../../../src/xml/comments';
import { collectComments } from '../../../src/xml/comments';
import {
    DELETE_ATTRIBUTE,
    DELETE_ELEMENT,
    INSERT_ATTRIBUTE,
    INSERT_ELEMENT,
    UPDATE_ATTRIBUTE_VALUE,
    UPDATE_ELEMENT_NAME
} from '../../../src/types';

function parseXML(text: string): [XMLDocument, Comment[]] {
    const { cst, tokenVector } = parse(text);
    const comments = collectComments(tokenVector);
    return [buildAst(cst as DocumentCstNode, tokenVector), comments];
}

function testWriter(text: string, changes: XMLDocumentChange[], expectedText: string, log = false): void {
    const [document, comments] = parseXML(text);
    const textDoc = TextDocument.create('', 'xml', 0, text);
    const writer = new XMLWriter(document, comments, textDoc);
    for (const change of changes) {
        writer.addChange(change);
    }

    const edits = writer.getTextEdits();
    const textAfterEdit = applyTextEdits('', 'xml', edits, text);
    if (log) {
        console.log(text);
        console.log(JSON.stringify(edits, undefined, 2));
        console.log(textAfterEdit);
    }
    expect(textAfterEdit).toStrictEqual(expectedText);
}

/**
 * There are multiple text edits that lead to the same output text.
 * For this reason we should use resulting text for testing instead.
 */
describe('xml writer', () => {
    describe('insert element', () => {
        test('add element to empty document', () => {
            testWriter('', [insertElement('', createElementNode({ name: 'test' }))], '<test/>');
        });
        test('add element to empty document (multiple changes)', () => {
            testWriter(
                '',
                [
                    insertElement('', createElementNode({ name: 'first' })),
                    insertElement('', createElementNode({ name: 'test' }))
                ],
                '<test/>'
            );
        });
        test('add element to empty document with namespace', () => {
            testWriter('', [insertElement('', createElementNode({ name: 'test' }))], '<test/>');
        });

        test('use parent namespace', () => {
            testWriter(
                '',
                [
                    insertElement(
                        '',
                        createElementNode({
                            name: 'Edmx',
                            namespaceAlias: 'Edmx',
                            attributes: {
                                'xmlns:a': createAttributeNode('xmlns:a', 'http://docs.oasis-open.org/odata/ns/edmx')
                            },
                            content: [createElementNode({ name: 'DataServices', namespaceAlias: 'Edmx' })]
                        })
                    )
                ],
                `<a:Edmx xmlns:a="http://docs.oasis-open.org/odata/ns/edmx">
    <a:DataServices/>
</a:Edmx>`
            );
        });
        test('default edmx namespace', () => {
            testWriter(
                `<Edmx xmlns="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
</Edmx>`,
                [insertElement('/rootElement', createElementNode({ name: 'DataServices', namespaceAlias: 'Edmx' }))],
                `<Edmx xmlns="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
    <DataServices/>
</Edmx>`
            );
        });
        test('default namespace', () => {
            testWriter(
                `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
    <edmx:DataServices>
        <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm">
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`,
                [insertElement('/rootElement/subElements/0/subElements/0', createElementNode({ name: 'Annotations' }))],
                `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
    <edmx:DataServices>
        <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm">
            <Annotations/>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`
            );
        });

        test('different edm namespace', () => {
            testWriter(
                `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
    <edmx:DataServices>
        <Schema xmlns:edm="http://docs.oasis-open.org/odata/ns/edm">
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`,
                [insertElement('/rootElement/subElements/0/subElements/0', createElementNode({ name: 'Annotations' }))],
                `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
    <edmx:DataServices>
        <Schema xmlns:edm="http://docs.oasis-open.org/odata/ns/edm">
            <edm:Annotations/>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`
            );
        });

        test('add element to empty element', () => {
            testWriter(
                '<abc/>',
                [insertElement('/rootElement', createElementNode({ name: 'test' }))],
                '<abc>\n    <test/>\n</abc>'
            );
        });
        test('add element to empty element with indentation', () => {
            testWriter(
                `<abc>
    <a/>
</abc>`,
                [insertElement('/rootElement/subElements/0', createElementNode({ name: 'test' }))],
                `<abc>
    <a>
        <test/>
    </a>
</abc>`
            );
        });

        test('add multiple elements to empty element', () => {
            testWriter(
                '<abc/>',
                [
                    insertElement('/rootElement', createElementNode({ name: 'a' })),
                    insertElement('/rootElement', createElementNode({ name: 'b' }))
                ],
                '<abc>\n    <a/>\n    <b/>\n</abc>'
            );
        });

        test('add element to element with no content', () => {
            testWriter(
                '<abc></abc>',
                [insertElement('/rootElement', createElementNode({ name: 'test' }))],
                '<abc>\n    <test/>\n</abc>'
            );
        });

        test('add element to element with indentation and no content', () => {
            testWriter(
                '    <abc>\n    </abc>',
                [insertElement('/rootElement', createElementNode({ name: 'test' }))],
                '    <abc>\n        <test/>\n    </abc>'
            );
        });

        test('insert elements to element with content at index', () => {
            testWriter(
                '<abc><a/></abc>',
                [insertElement('/rootElement', createElementNode({ name: 'a' }), 0)],
                '<abc>\n    <a/>\n    <a/></abc>'
            );
        });
        test('insert elements to element with content at index before a comment', () => {
            testWriter(
                `
<abc>
<!-- -->
    <a/>
</abc>`,
                [insertElement('/rootElement', createElementNode({ name: 'a' }), 0)],
                `
<abc>
    <a/>
<!-- -->
    <a/>
</abc>`
            );
        });

        test('insert elements to element with content at index before an indented comment', () => {
            testWriter(
                `
<abc>
    <!-- -->
    <a/>
</abc>`,
                [insertElement('/rootElement', createElementNode({ name: 'a' }), 0)],
                `
<abc>
    <a/>
    <!-- -->
    <a/>
</abc>`
            );
        });
        test('insert elements to element with content at index with siblings on the same line', () => {
            testWriter(
                `
<abc>
    <a/><b/>
</abc>`,
                [insertElement('/rootElement', createElementNode({ name: 'c' }), 1)],
                `
<abc>
    <a/>
    <c/>
    <b/>
</abc>`
            );
        });

        test('insert elements to element with content at index with siblings on the same line and whitespace', () => {
            testWriter(
                `
<abc>
    <a/>      <b/>
</abc>`,
                [insertElement('/rootElement', createElementNode({ name: 'c' }), 1)],
                `
<abc>
    <a/>
    <c/>
    <b/>
</abc>`
            );
        });

        test('insert elements to element with content at index', () => {
            testWriter(
                '<abc>\n    <a/>\n    <c/>\n</abc>',
                [
                    {
                        type: INSERT_ELEMENT,
                        pointer: '/rootElement',
                        element: createElementNode({
                            name: 'f'
                        }),
                        index: 0
                    },
                    {
                        type: INSERT_ELEMENT,
                        pointer: '/rootElement',
                        element: createElementNode({
                            name: 'b'
                        }),
                        index: 1
                    }
                ],
                '<abc>\n    <f/>\n    <a/>\n    <b/>\n    <c/>\n</abc>'
            );
        });

        test('add element to element with content at the end', () => {
            testWriter(
                '<abc>\n    <a/>\n</abc>',
                [
                    {
                        type: INSERT_ELEMENT,
                        pointer: '/rootElement',
                        element: createElementNode({
                            name: 'b'
                        })
                    },
                    {
                        type: INSERT_ELEMENT,
                        pointer: '/rootElement',
                        element: createElementNode({
                            name: 'c'
                        })
                    }
                ],
                '<abc>\n    <a/>\n    <b/>\n    <c/>\n</abc>'
            );
        });

        test('add element to element no content in multiple lines', () => {
            const [document, comments] = parseXML('<abc>\n</abc>');
            const textDoc = TextDocument.create('', 'xml', 0, '<abc>\n</abc');
            const writer = new XMLWriter(document, comments, textDoc);
            const change: InsertElement = {
                type: INSERT_ELEMENT,
                pointer: '/rootElement',
                element: createElementNode({
                    name: 'test'
                })
            };

            writer.addChange(change);
            const edits = writer.getTextEdits();
            expect(edits).toStrictEqual([TextEdit.insert(Position.create(1, 0), '    <test/>\n')]);
        });
    });

    describe('update element name', () => {
        test('element with no content', () => {
            const [document, comments] = parseXML('<abc aa="bb"/>');
            const textDoc = TextDocument.create('', 'xml', 0, '<abc aa="bb"/>');
            const writer = new XMLWriter(document, comments, textDoc);
            const change: UpdateElementName = {
                type: UPDATE_ELEMENT_NAME,
                pointer: '/rootElement',
                newName: 'test'
            };

            writer.addChange(change);
            const edits = writer.getTextEdits();
            expect(edits).toStrictEqual([TextEdit.replace(Range.create(0, 1, 0, 4), 'test')]);
        });
        test('element with content and empty name', () => {
            const [document, comments] = parseXML('<>\n</>');
            const textDoc = TextDocument.create('', 'xml', 0, '<>\n</>');
            const writer = new XMLWriter(document, comments, textDoc);
            const change: UpdateElementName = {
                type: UPDATE_ELEMENT_NAME,
                pointer: '/rootElement',
                newName: 'test'
            };

            writer.addChange(change);
            const edits = writer.getTextEdits();
            expect(edits).toStrictEqual([
                TextEdit.replace(Range.create(0, 1, 0, 1), 'test'),
                TextEdit.replace(Range.create(1, 2, 1, 2), 'test')
            ]);
        });
        test('element with content', () => {
            const textDoc = TextDocument.create('', 'xml', 0, '<abc>\n</abc>');
            const [document, comments] = parseXML('<abc>\n</abc>');
            const writer = new XMLWriter(document, comments, textDoc);
            const change: UpdateElementName = {
                type: UPDATE_ELEMENT_NAME,
                pointer: '/rootElement',
                newName: 'test'
            };

            writer.addChange(change);
            const edits = writer.getTextEdits();
            expect(edits).toStrictEqual([
                TextEdit.replace(Range.create(0, 1, 0, 4), 'test'),
                TextEdit.replace(Range.create(1, 2, 1, 5), 'test')
            ]);
        });
        test('multiple changes for the same element', () => {
            const textDoc = TextDocument.create('', 'xml', 0, '<abc>\n</abc>');
            const [document, comments] = parseXML('<abc>\n</abc>');
            const writer = new XMLWriter(document, comments, textDoc);

            writer.addChange({
                type: UPDATE_ELEMENT_NAME,
                pointer: '/rootElement',
                newName: 'a'
            });
            writer.addChange({
                type: UPDATE_ELEMENT_NAME,
                pointer: '/rootElement',
                newName: 'b'
            });
            const edits = writer.getTextEdits();
            expect(edits).toStrictEqual([
                TextEdit.replace(Range.create(0, 1, 0, 4), 'b'),
                TextEdit.replace(Range.create(1, 2, 1, 5), 'b')
            ]);
        });

        test('to parent and child', () => {
            testWriter(
                '<abc>\n    <a/>\n</abc>',
                [
                    {
                        type: UPDATE_ELEMENT_NAME,
                        pointer: '/rootElement',
                        newName: 'a'
                    },
                    {
                        type: UPDATE_ELEMENT_NAME,
                        pointer: '/rootElement/subElements/0',
                        newName: 'b'
                    }
                ],
                '<a>\n    <b/>\n</a>'
            );
        });
    });

    describe('delete element', () => {
        test('root', () => {
            testWriter(
                '<a/>',
                [
                    {
                        type: DELETE_ELEMENT,
                        pointer: '/rootElement'
                    }
                ],
                ''
            );
        });
        test('root with content', () => {
            testWriter(
                '<a>\n</a>',
                [
                    {
                        type: DELETE_ELEMENT,
                        pointer: '/rootElement'
                    }
                ],
                ''
            );
        });
        test('element with no content', () => {
            testWriter(
                '<abc>\n    <a/>\n</abc>',
                [
                    {
                        type: DELETE_ELEMENT,
                        pointer: '/rootElement/subElements/0'
                    }
                ],
                '<abc></abc>'
            );
        });
        test('element with no content, in the middle', () => {
            testWriter(
                '<abc>\n    <a/>\n    <b/>\n</abc>',
                [
                    {
                        type: DELETE_ELEMENT,
                        pointer: '/rootElement/subElements/0'
                    }
                ],
                '<abc>\n    <b/>\n</abc>'
            );
        });
        test('element with content after empty element', () => {
            testWriter(
                '<abc>\n    <a/>\n    <b></b>\n</abc>',
                [
                    {
                        type: DELETE_ELEMENT,
                        pointer: '/rootElement/subElements/1'
                    }
                ],
                '<abc>\n    <a/>\n</abc>'
            );
        });
        test('element with trailing inline comment', () => {
            testWriter(
                '<abc>\n    <a/>  <!-- my comment -->\n    <b/>\n</abc>',
                [
                    {
                        type: DELETE_ELEMENT,
                        pointer: '/rootElement/subElements/0'
                    }
                ],
                '<abc>\n    <b/>\n</abc>'
            );
        });
        test('element with content, in the middle', () => {
            testWriter(
                '<abc>\n    <a/>\n    <b/>\n    <c/>\n</abc>',
                [
                    {
                        type: DELETE_ELEMENT,
                        pointer: '/rootElement/subElements/1'
                    }
                ],
                '<abc>\n    <a/>\n    <c/>\n</abc>'
            );
        });
        test('element with content, first one', () => {
            testWriter(
                '<abc>\n    <a/>\n    <b/>\n    <c/>\n</abc>',
                [
                    {
                        type: DELETE_ELEMENT,
                        pointer: '/rootElement/subElements/0'
                    }
                ],
                '<abc>\n    <b/>\n    <c/>\n</abc>'
            );
        });
        test('element with no content, no whitespace', () => {
            testWriter(
                '<abc><a/></abc>',
                [
                    {
                        type: DELETE_ELEMENT,
                        pointer: '/rootElement/subElements/0'
                    }
                ],
                '<abc></abc>'
            );
        });
        test('element with content', () => {
            testWriter(
                '<abc>\n    <a></a>\n</abc>',
                [
                    {
                        type: DELETE_ELEMENT,
                        pointer: '/rootElement/subElements/0'
                    }
                ],
                '<abc></abc>'
            );
        });
        test('last element value', () => {
            testWriter(
                '<abc><a/><b/></abc>',
                [
                    {
                        type: DELETE_ELEMENT,
                        pointer: '/rootElement/subElements/1'
                    }
                ],
                '<abc><a/></abc>'
            );
        });
        test('last element value with spacing', () => {
            testWriter(
                '<abc>\n    <a/>\n    <b/>\n</abc>',
                [
                    {
                        type: DELETE_ELEMENT,
                        pointer: '/rootElement/subElements/1'
                    }
                ],
                '<abc>\n    <a/>\n</abc>'
            );
        });
    });

    describe('insert attribute', () => {
        test('at the end', () => {
            const textDoc = TextDocument.create('', 'xml', 0, '<abc></abc>');
            const [document, comments] = parseXML('<abc></abc>');
            const writer = new XMLWriter(document, comments, textDoc);
            writer.addChange({
                type: INSERT_ATTRIBUTE,
                name: 'foo',
                value: 'bar',
                pointer: '/rootElement'
            });
            const edits = writer.getTextEdits();
            expect(edits).toStrictEqual([TextEdit.insert(Position.create(0, 4), ' foo="bar"')]);
        });
        test('at the end of empty element', () => {
            const textDoc = TextDocument.create('', 'xml', 0, '<abc/>');
            const [document, comments] = parseXML('<abc/>');
            const writer = new XMLWriter(document, comments, textDoc);
            writer.addChange({
                type: INSERT_ATTRIBUTE,
                name: 'foo',
                value: 'bar',
                pointer: '/rootElement'
            });
            const edits = writer.getTextEdits();
            expect(edits).toStrictEqual([TextEdit.insert(Position.create(0, 4), ' foo="bar"')]);
        });
        test('multiple changes', () => {
            const textDoc = TextDocument.create('', 'xml', 0, '<abc/>');
            const [document, comments] = parseXML('<abc/>');
            const writer = new XMLWriter(document, comments, textDoc);
            writer.addChange({
                type: INSERT_ATTRIBUTE,
                name: 'foo',
                value: 'bar',
                pointer: '/rootElement'
            });
            writer.addChange({
                type: INSERT_ATTRIBUTE,
                name: 'bar',
                value: 'foo',
                pointer: '/rootElement'
            });
            const edits = writer.getTextEdits();
            expect(edits).toStrictEqual([TextEdit.insert(Position.create(0, 4), ' foo="bar" bar="foo"')]);
        });
        test('after existing attribute', () => {
            const textDoc = TextDocument.create('', 'xml', 0, '<abc a="b"></abc>');
            const [document, comments] = parseXML('<abc a="b"></abc>');
            const writer = new XMLWriter(document, comments, textDoc);
            writer.addChange({
                type: INSERT_ATTRIBUTE,
                name: 'foo',
                value: 'bar',
                pointer: '/rootElement'
            });
            const edits = writer.getTextEdits();
            expect(edits).toStrictEqual([TextEdit.insert(Position.create(0, 10), ' foo="bar"')]);
        });
        test('at specific index', () => {
            const textDoc = TextDocument.create('', 'xml', 0, '<abc a="b"></abc>');
            const [document, comments] = parseXML('<abc a="b"></abc>');
            const writer = new XMLWriter(document, comments, textDoc);
            writer.addChange({
                type: INSERT_ATTRIBUTE,
                name: 'foo',
                value: 'bar',
                pointer: '/rootElement',
                index: 0
            });
            const edits = writer.getTextEdits();
            expect(edits).toStrictEqual([TextEdit.insert(Position.create(0, 4), ' foo="bar"')]);
        });
        test('multiple inserts', () => {
            const textDoc = TextDocument.create('', 'xml', 0, '<abc a="b"></abc>');
            const [document, comments] = parseXML('<abc a="b"></abc>');
            const writer = new XMLWriter(document, comments, textDoc);
            writer.addChange({
                type: INSERT_ATTRIBUTE,
                name: 'foo',
                value: 'bar',
                pointer: '/rootElement',
                index: 0
            });
            writer.addChange({
                type: INSERT_ATTRIBUTE,
                name: 'a',
                value: 'b',
                pointer: '/rootElement'
            });
            const edits = writer.getTextEdits();
            expect(edits).toStrictEqual([
                TextEdit.insert(Position.create(0, 4), ' foo="bar"'),
                TextEdit.insert(Position.create(0, 10), ' a="b"')
            ]);
        });
    });

    describe('update attribute name', () => {
        test('simple', () => {
            const textDoc = TextDocument.create('', 'xml', 0, '<abc abc="b"></abc>');
            const [document, comments] = parseXML('<abc abc="b"></abc>');
            const writer = new XMLWriter(document, comments, textDoc);
            writer.addChange({
                type: UPDATE_ATTRIBUTE_NAME,
                newName: 'foo',
                pointer: '/rootElement/attributes/0'
            });
            const edits = writer.getTextEdits();
            expect(edits).toStrictEqual([TextEdit.replace(Range.create(0, 5, 0, 8), 'foo')]);
        });
        test('multiple name updates to the same attribute', () => {
            const textDoc = TextDocument.create('', 'xml', 0, '<abc abc="b"></abc>');
            const [document, comments] = parseXML('<abc abc="b"></abc>');
            const writer = new XMLWriter(document, comments, textDoc);
            writer.addChange({
                type: 'update-attribute-name',
                newName: 'foo',
                pointer: '/rootElement/attributes/0'
            });
            writer.addChange({
                type: UPDATE_ATTRIBUTE_NAME,
                newName: 'bar',
                pointer: '/rootElement/attributes/0'
            });
            const edits = writer.getTextEdits();
            expect(edits).toStrictEqual([TextEdit.replace(Range.create(0, 5, 0, 8), 'bar')]);
        });
    });
    describe('update attribute value', () => {
        test('simple', () => {
            const textDoc = TextDocument.create('', 'xml', 0, '<abc abc="b"></abc>');
            const [document, comments] = parseXML('<abc abc="b"></abc>');
            const writer = new XMLWriter(document, comments, textDoc);
            writer.addChange({
                type: UPDATE_ATTRIBUTE_VALUE,
                newValue: 'foo',
                pointer: '/rootElement/attributes/0'
            });
            const edits = writer.getTextEdits();
            expect(edits).toStrictEqual([TextEdit.replace(Range.create(0, 10, 0, 11), 'foo')]);
        });
        test('multiple name updates to the same attribute', () => {
            const textDoc = TextDocument.create('', 'xml', 0, '<abc abc="b"></abc>');
            const [document, comments] = parseXML('<abc abc="b"></abc>');
            const writer = new XMLWriter(document, comments, textDoc);
            writer.addChange({
                type: UPDATE_ATTRIBUTE_VALUE,
                newValue: 'foo',
                pointer: '/rootElement/attributes/0'
            });
            writer.addChange({
                type: UPDATE_ATTRIBUTE_VALUE,
                newValue: 'bar',
                pointer: '/rootElement/attributes/0'
            });
            const edits = writer.getTextEdits();
            expect(edits).toStrictEqual([TextEdit.replace(Range.create(0, 10, 0, 11), 'bar')]);
        });
    });
    describe('delete attribute', () => {
        test('simple', () => {
            const textDoc = TextDocument.create('', 'xml', 0, '<abc abc="b"></abc>');
            const [document, comments] = parseXML('<abc abc="b"></abc>');
            const writer = new XMLWriter(document, comments, textDoc);
            writer.addChange({
                type: DELETE_ATTRIBUTE,
                pointer: '/rootElement/attributes/0'
            });
            const edits = writer.getTextEdits();
            expect(edits).toStrictEqual([TextEdit.del(Range.create(0, 4, 0, 12))]);
        });
        test('attribute between two attributes', () => {
            const textDoc = TextDocument.create('', 'xml', 0, '<abc a="b" c="d" e="f"></abc>');
            const [document, comments] = parseXML('<abc a="b" c="d" e="f"></abc>');
            const writer = new XMLWriter(document, comments, textDoc);
            writer.addChange({
                type: DELETE_ATTRIBUTE,
                pointer: '/rootElement/attributes/1'
            });
            const edits = writer.getTextEdits();
            expect(edits).toStrictEqual([TextEdit.del(Range.create(0, 10, 0, 16))]);
        });
    });

    describe('replace element', () => {
        test('edmx namespace', () => {
            testWriter(
                `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
    <edmx:Reference/>
</edmx:Edmx>`,
                [
                    {
                        type: 'replace-element',
                        pointer: '/rootElement/subElements/0',
                        newElement: createElementNode({ name: 'DataServices', namespaceAlias: 'Edmx' })
                    }
                ],
                `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
    <edmx:DataServices/>
</edmx:Edmx>`
            );
        });
        test('edm namespace', () => {
            testWriter(
                `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
    <edmx:DataServices>
        <Schema xmlns:edm="http://docs.oasis-open.org/odata/ns/edm">
            <edm:Annotation/>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`,
                [
                    {
                        type: 'replace-element',
                        pointer: '/rootElement/subElements/0/subElements/0/subElements/0',
                        newElement: createElementNode({ name: 'Annotations' })
                    }
                ],
                `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
    <edmx:DataServices>
        <Schema xmlns:edm="http://docs.oasis-open.org/odata/ns/edm">
            <edm:Annotations/>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`
            );
        });
    });

    describe('replace element content', () => {
        test('element with content', () => {
            testWriter(
                '<abc>\n    <a/>\n</abc>',
                [
                    {
                        type: REPLACE_ELEMENT_CONTENT,
                        pointer: '/rootElement',
                        newValue: [createTextNode('test')]
                    }
                ],
                '<abc>test</abc>'
            );
        });
        test('empty element', () => {
            testWriter(
                '<abc/>',
                [
                    {
                        type: REPLACE_ELEMENT_CONTENT,
                        pointer: '/rootElement',
                        newValue: [createTextNode('test')]
                    }
                ],
                '<abc>test</abc>'
            );
        });
        test('edmx namespace', () => {
            testWriter(
                `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
    <edmx:Reference/>
</edmx:Edmx>`,
                [
                    {
                        type: REPLACE_ELEMENT_CONTENT,
                        pointer: '/rootElement',
                        newValue: [createElementNode({ name: 'DataServices', namespaceAlias: 'Edmx' })]
                    }
                ],
                `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0"><edmx:DataServices/></edmx:Edmx>`
            );
        });
    });
    describe('move', () => {
        test('same collection', () => {
            testWriter(
                `
    <abc>
        <a1/>
        <a2/>
    </abc>`,
                [
                    {
                        type: MOVE_COLLECTION_VALUE,
                        pointer: '/rootElement',
                        index: 0,
                        fromPointers: ['/rootElement/subElements/1']
                    }
                ],
                `
    <abc>
        <a2/>
        <a1/>
    </abc>`
            );
        });
        test('middle of collection', () => {
            testWriter(
                `
    <abc>
        <a1></a1>
        <a2></a2>
        <a3></a3>
    </abc>`,
                [
                    {
                        type: MOVE_COLLECTION_VALUE,
                        pointer: '/rootElement',
                        index: 1,
                        fromPointers: ['/rootElement/subElements/2']
                    }
                ],
                `
    <abc>
        <a1></a1>
        <a3></a3>
        <a2></a2>
    </abc>`
            );
        });
        test('to the end collection', () => {
            testWriter(
                `
    <abc>
        <a1></a1>
        <a2></a2>
        <a3></a3>
    </abc>`,
                [
                    {
                        type: MOVE_COLLECTION_VALUE,
                        pointer: '/rootElement',
                        fromPointers: ['/rootElement/subElements/0']
                    }
                ],
                `
    <abc>
        <a2></a2>
        <a3></a3>
        <a1></a1>
    </abc>`
            );
        });
        test('middle of collection (self closed)', () => {
            testWriter(
                `
    <abc>
        <a1/>
        <a2/>
        <a3/>
    </abc>`,
                [
                    {
                        type: MOVE_COLLECTION_VALUE,
                        pointer: '/rootElement',
                        index: 1,
                        fromPointers: ['/rootElement/subElements/2']
                    }
                ],
                `
    <abc>
        <a1/>
        <a3/>
        <a2/>
    </abc>`
            );
        });
        test('to the end collection (self closed)', () => {
            testWriter(
                `
    <abc>
        <a1/>
        <a2/>
        <a3/>
    </abc>`,
                [
                    {
                        type: MOVE_COLLECTION_VALUE,
                        pointer: '/rootElement',
                        fromPointers: ['/rootElement/subElements/0']
                    }
                ],
                `
    <abc>
        <a2/>
        <a3/>
        <a1/>
    </abc>`
            );
        });
        test('same collection, multiple elements', () => {
            testWriter(
                `
    <abc>
        <a1/>
        <a2/>
        <a3/>
        <a4/>
        <a5/>
        <a6/>
    </abc>`,
                [
                    {
                        type: MOVE_COLLECTION_VALUE,
                        pointer: '/rootElement',
                        index: 0,
                        fromPointers: [
                            '/rootElement/subElements/1',
                            '/rootElement/subElements/3',
                            '/rootElement/subElements/4'
                        ]
                    }
                ],
                `
    <abc>
        <a2/>
        <a4/>
        <a5/>
        <a1/>
        <a3/>
        <a6/>
    </abc>`
            );
        });
        test('same collection and comments', () => {
            testWriter(
                `
    <abc>
        <!-- a one -->
        <a/> <!-- a two -->
        <!-- b one -->
        <b/> <!-- b two -->
    </abc>`,
                [
                    {
                        type: MOVE_COLLECTION_VALUE,
                        pointer: '/rootElement',
                        index: 0,
                        fromPointers: ['/rootElement/subElements/1']
                    }
                ],
                `
    <abc>
        <!-- b one -->
        <b/> <!-- b two -->
        <!-- a one -->
        <a/> <!-- a two -->
    </abc>`
            );
        });

        test('same collection and comments (case 2)', () => {
            testWriter(
                `
    <abc>
        <!-- a one -->
        <a/> <!-- a two -->
        <!-- b one -->
        <b/> <!-- b two --> <!-- b three -->
        <!-- c one -->
        <c/> <!-- c two -->
    </abc>`,
                [
                    {
                        type: MOVE_COLLECTION_VALUE,
                        pointer: '/rootElement',
                        index: 2,
                        fromPointers: ['/rootElement/subElements/0']
                    }
                ],
                `
    <abc>
        <!-- b one -->
        <b/> <!-- b two --> <!-- b three -->
        <!-- a one -->
        <a/> <!-- a two -->
        <!-- c one -->
        <c/> <!-- c two -->
    </abc>`
            );
        });
        test('same collection and standalone comment', () => {
            testWriter(
                `
    <abc>
        <!-- a one -->
        <a/> <!-- a two -->
        <!--comment standalone 1 --> 
        <!--comment standalone 2 -->
        <!-- b one -->
        <b/> <!-- b two -->
    </abc>`,
                [
                    {
                        type: MOVE_COLLECTION_VALUE,
                        pointer: '/rootElement',
                        index: 0,
                        fromPointers: ['/rootElement/subElements/1']
                    }
                ],
                `
    <abc>
        <!-- b one -->
        <b/> <!-- b two -->
        <!-- a one -->
        <a/> <!-- a two -->
        <!--comment standalone 1 --> 
        <!--comment standalone 2 -->
    </abc>`
            );
        });
        test('same collection, multiple elements and comments', () => {
            testWriter(
                `
    <abc>
        <!--comment 1-->
        <a1/>
        <a2/><!--comment 2-->
        <!--comment 3-->
        <a3/>
        <!--comment 4-->
        <a4/>
        <!--comment 5--><a5>
            <!-- inner -->
        </a5>
        <!--comment 6-->
        <a6/>
    </abc>`,
                [
                    {
                        type: MOVE_COLLECTION_VALUE,
                        pointer: '/rootElement',
                        index: 0,
                        fromPointers: [
                            '/rootElement/subElements/1',
                            '/rootElement/subElements/3',
                            '/rootElement/subElements/4'
                        ]
                    }
                ],
                `
    <abc>
        <a2/><!--comment 2-->
        <!--comment 4-->
        <a4/>
        <!--comment 5--><a5>
            <!-- inner -->
        </a5>
        <!--comment 1-->
        <a1/>
        <!--comment 3-->
        <a3/>
        <!--comment 6-->
        <a6/>
    </abc>`
            );
        });
        test('same collection, with closing tag', () => {
            testWriter(
                `
    <abc>
        <a1></a1>
        <a2></a2>
    </abc>`,
                [
                    {
                        type: MOVE_COLLECTION_VALUE,
                        pointer: '/rootElement',
                        index: 0,
                        fromPointers: ['/rootElement/subElements/1']
                    }
                ],
                `
    <abc>
        <a2></a2>
        <a1></a1>
    </abc>`
            );
        });
        test('different collection', () => {
            testWriter(
                `
    <abc>
        <a>
            <a1/>
            <a2/>
        </a>
        <b>
        </b>
    </abc>`,
                [
                    {
                        type: MOVE_COLLECTION_VALUE,
                        pointer: '/rootElement/subElements/1',
                        index: 0,
                        fromPointers: [
                            '/rootElement/subElements/0/subElements/0',
                            '/rootElement/subElements/0/subElements/1'
                        ]
                    }
                ],
                `
    <abc>
        <a>
        </a>
        <b>
            <a1/>
            <a2/>
        </b>
    </abc>`
            );
        });
        test('different collection with self closed target', () => {
            testWriter(
                `
    <abc>
        <a>
            <a1/>
            <a2/>
        </a>
        <b/>
    </abc>`,
                [
                    {
                        type: MOVE_COLLECTION_VALUE,
                        pointer: '/rootElement/subElements/1',
                        index: 0,
                        fromPointers: [
                            '/rootElement/subElements/0/subElements/0',
                            '/rootElement/subElements/0/subElements/1'
                        ]
                    }
                ],
                `
    <abc>
        <a>
        </a>
        <b>
            <a1/>
            <a2/>
        </b>
    </abc>`
            );
        });
    });

    describe('combinations', () => {
        test('remove and add edmx namespace', () => {
            testWriter(
                `<edmx:Edmx>
    <edmx:Reference/>
    <edmx:Reference/>
</edmx:Edmx>`,
                [
                    // order is important, delete should be first
                    {
                        type: 'delete-element',
                        pointer: '/rootElement/subElements/0'
                    },
                    {
                        type: 'insert-element',
                        pointer: '/rootElement',
                        element: createElementNode({
                            name: 'Reference',
                            namespaceAlias: 'Edmx',
                            attributes: { ['Uri']: createAttributeNode('Uri', 'a') }
                        }),
                        index: 0
                    },
                    {
                        type: 'insert-element',
                        pointer: '/rootElement',
                        element: createElementNode({
                            name: 'Reference',
                            namespaceAlias: 'Edmx',
                            attributes: { ['Uri']: createAttributeNode('Uri', 'b') }
                        }),
                        index: 0
                    },
                    {
                        type: 'insert-element',
                        pointer: '/rootElement',
                        element: createElementNode({
                            name: 'Reference',
                            namespaceAlias: 'Edmx',
                            attributes: { ['Uri']: createAttributeNode('Uri', 'c') }
                        }),
                        index: 0
                    }
                ],
                `<edmx:Edmx>
    <Reference Uri="a"/>
    <Reference Uri="b"/>
    <Reference Uri="c"/>
    <edmx:Reference/>
</edmx:Edmx>`
            );
        });
    });
});
