import { buildAst } from '@xml-tools/ast';
import type { DocumentCstNode } from '@xml-tools/parser';
import { parse } from '@xml-tools/parser';

import type { Element, TextNode } from '@sap-ux/odata-annotation-core';

import { convertDocument } from '../../src/parser';

function parseXml(text: string): Element | undefined {
    const { cst, tokenVector } = parse(text);
    const ast = buildAst(cst as DocumentCstNode, tokenVector);
    return convertDocument(ast);
}

describe('parse', () => {
    test(`partial`, () => {
        const result = parseXml('<Annotation ');
        expect(result).toMatchInlineSnapshot(`
            Object {
              "attributes": Object {},
              "content": Array [],
              "contentRange": undefined,
              "name": "Annotation",
              "nameRange": Object {
                "end": Object {
                  "character": 11,
                  "line": 0,
                },
                "start": Object {
                  "character": 1,
                  "line": 0,
                },
              },
              "namespace": undefined,
              "namespaceAlias": undefined,
              "range": Object {
                "end": Object {
                  "character": 11,
                  "line": 0,
                },
                "start": Object {
                  "character": 0,
                  "line": 0,
                },
              },
              "type": "element",
            }
        `);
    });
    describe('text nodes', () => {
        test(`text`, () => {
            const result = parseXml('<a>abc</a>');
            expect(result?.content?.map((node) => node.type)).toStrictEqual(['text']);
            expect(
                result?.content?.filter((node): node is TextNode => node.type === 'text').map((node) => node.text)
            ).toStrictEqual(['abc']);
        });

        test(`leading whitespace`, () => {
            const result = parseXml('<a>  abc</a>');
            expect(result?.content?.map((node) => node.type)).toStrictEqual(['text']);
            expect(
                result?.content?.filter((node): node is TextNode => node.type === 'text').map((node) => node.text)
            ).toStrictEqual(['  abc']);
        });

        test(`trailing whitespace`, () => {
            const result = parseXml('<a>  abc \n\n</a>');
            expect(result?.content?.map((node) => node.type)).toStrictEqual(['text']);
            expect(
                result?.content?.filter((node): node is TextNode => node.type === 'text').map((node) => node.text)
            ).toStrictEqual(['  abc \n\n']);
        });

        test(`trailing whitespace`, () => {
            const result = parseXml('<a>  abc \n\n</a>');
            expect(result?.content?.map((node) => node.type)).toStrictEqual(['text']);
            expect(
                result?.content?.filter((node): node is TextNode => node.type === 'text').map((node) => node.text)
            ).toStrictEqual(['  abc \n\n']);
        });

        test(`child elements`, () => {
            const result = parseXml('<a>  abc\n<b/>\nxyz <d/></a>');
            expect(result?.content?.map((node) => node.type)).toStrictEqual(['text', 'element', 'text', 'element']);
            expect(
                result?.content?.filter((node): node is TextNode => node.type === 'text').map((node) => node.text)
            ).toStrictEqual(['  abc\n', '\nxyz ']);
        });
    });
});
