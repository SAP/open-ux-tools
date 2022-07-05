import { buildAst } from '@xml-tools/ast';
import type { DocumentCstNode } from '@xml-tools/parser';
import { parse } from '@xml-tools/parser';

import type { AnnotationFile } from '@sap-ux/odata-annotation-core-types';

import { convertDocument } from '../../src/parser';

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
});
