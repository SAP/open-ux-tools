import { buildAst } from '@xml-tools/ast';
import type { DocumentCstNode } from '@xml-tools/parser';
import { parse } from '@xml-tools/parser';

import type { AnnotationFile, TextNode } from '@sap-ux/odata-annotation-core-types';

import { convertDocument } from '../../src/parser';

function parseXml(text: string): AnnotationFile | undefined {
    const { cst, tokenVector } = parse(text);
    const ast = buildAst(cst as DocumentCstNode, tokenVector);
    return convertDocument('file://annotations.xml', ast);
}
function parseWithMarkup(text: string): AnnotationFile | undefined {
    const markup = `<?xml version="1.0" encoding="utf-8"?>
    <edmx:Edmx Version="4.0"
            xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
        <edmx:Reference Uri="/sap/opu/odata/sap/SEPMRA_PROD_MAN/$metadata">
            <edmx:Include Alias="SEPMRA_PROD_MAN_ALIAS" Namespace="SEPMRA_PROD_MAN"/>
        </edmx:Reference>
        <edmx:DataServices>
            <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="test1.SEPMRA_PROD_MAN">${text}</Schema>
        </edmx:DataServices>
    </edmx:Edmx>
    `;
    const { cst, tokenVector } = parse(markup);
    const ast = buildAst(cst as DocumentCstNode, tokenVector);
    return convertDocument('file://annotations.xml', ast);
}

describe('parse', () => {
    // test(`partial`, () => {
    //     const result = parseXml('<Annotation ');
    //     expect(result).toMatchInlineSnapshot(`
    //         Object {
    //           "attributes": Object {},
    //           "content": Array [],
    //           "contentRange": undefined,
    //           "name": "Annotation",
    //           "nameRange": Object {
    //             "end": Object {
    //               "character": 11,
    //               "line": 0,
    //             },
    //             "start": Object {
    //               "character": 1,
    //               "line": 0,
    //             },
    //           },
    //           "namespace": undefined,
    //           "namespaceAlias": undefined,
    //           "range": Object {
    //             "end": Object {
    //               "character": 11,
    //               "line": 0,
    //             },
    //             "start": Object {
    //               "character": 0,
    //               "line": 0,
    //             },
    //           },
    //           "type": "element",
    //         }
    //     `);
    // });
    describe('targets', () => {
        test(`no terms`, () => {
            const result = parseWithMarkup('<Annotations Target="test/target/path()"></Annotations>');
            expect(result?.targets?.map((node) => node.name)).toStrictEqual(['test/target/path()']);
        });
        test(`no terms range`, () => {
            const result = parseWithMarkup('<Annotations Target="test/target/path()" />');
            expect(result?.targets?.map((node) => node.termsRange)).toStrictEqual([undefined]);
        });
        test(`one term`, () => {
            const result = parseWithMarkup(
                '<Annotations Target="test/target/path()"><Annotation Term="Test.Term" /></Annotations>'
            );
            expect(result?.targets[0].terms.map((term) => term.name)).toStrictEqual(['Annotation']);
            expect(result?.targets[0].terms[0].attributes['Term']?.value).toStrictEqual('Test.Term');
        });
    });
    // describe('text nodes', () => {
    //     test(`text`, () => {
    //         const result = parseXml('<a>abc</a>');
    //         expect(result?.content?.map((node) => node.type)).toStrictEqual(['text']);
    //         expect(
    //             result?.content?.filter((node): node is TextNode => node.type === 'text').map((node) => node.text)
    //         ).toStrictEqual(['abc']);
    //     });

    //     test(`leading whitespace`, () => {
    //         const result = parseXml('<a>  abc</a>');
    //         expect(result?.content?.map((node) => node.type)).toStrictEqual(['text']);
    //         expect(
    //             result?.content?.filter((node): node is TextNode => node.type === 'text').map((node) => node.text)
    //         ).toStrictEqual(['  abc']);
    //     });

    //     test(`trailing whitespace`, () => {
    //         const result = parseXml('<a>  abc \n\n</a>');
    //         expect(result?.content?.map((node) => node.type)).toStrictEqual(['text']);
    //         expect(
    //             result?.content?.filter((node): node is TextNode => node.type === 'text').map((node) => node.text)
    //         ).toStrictEqual(['  abc \n\n']);
    //     });

    //     test(`trailing whitespace`, () => {
    //         const result = parseXml('<a>  abc \n\n</a>');
    //         expect(result?.content?.map((node) => node.type)).toStrictEqual(['text']);
    //         expect(
    //             result?.content?.filter((node): node is TextNode => node.type === 'text').map((node) => node.text)
    //         ).toStrictEqual(['  abc \n\n']);
    //     });

    //     test(`child elements`, () => {
    //         const result = parseXml('<a>  abc\n<b/>\nxyz <d/></a>');
    //         expect(result?.content?.map((node) => node.type)).toStrictEqual(['text', 'element', 'text', 'element']);
    //         expect(
    //             result?.content?.filter((node): node is TextNode => node.type === 'text').map((node) => node.text)
    //         ).toStrictEqual(['  abc\n', '\nxyz ']);
    //     });
    // });
});
