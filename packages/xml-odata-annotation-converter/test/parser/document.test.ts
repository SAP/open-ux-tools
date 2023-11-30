import { buildAst } from '@xml-tools/ast';
import type { DocumentCstNode } from '@xml-tools/parser';
import { parse } from '@xml-tools/parser';

import type { AnnotationFile } from '@sap-ux/odata-annotation-core-types';
import { Range } from '@sap-ux/odata-annotation-core-types';

import { convertDocument } from '../../src/parser';

function parseWithMarkup(text: string): AnnotationFile | undefined {
    const markup = `<?xml version="1.0" encoding="utf-8"?>
    <edmx:Edmx Version="4.0"
            xmlns:edmx="https://docs.oasis-open.org/odata/ns/edmx">
        <edmx:Reference Uri="/sap/opu/odata/sap/SEPMRA_PROD_MAN/$metadata">
            <edmx:Include Alias="SEPMRA_PROD_MAN_ALIAS" Namespace="SEPMRA_PROD_MAN"/>
        </edmx:Reference>
        <edmx:DataServices>
            <Schema xmlns="https://docs.oasis-open.org/odata/ns/edm" Namespace="test1.SEPMRA_PROD_MAN">${text}</Schema>
        </edmx:DataServices>
    </edmx:Edmx>
    `;
    const { cst, tokenVector } = parse(markup);
    const ast = buildAst(cst as DocumentCstNode, tokenVector);
    return convertDocument('file://annotations.xml', ast);
}

function parseXml(text: string): AnnotationFile | undefined {
    const { cst, tokenVector } = parse(text);
    const ast = buildAst(cst as DocumentCstNode, tokenVector);
    return convertDocument('file://annotations.xml', ast);
}

describe('parse', () => {
    describe('references', () => {
        test(`with namespace`, () => {
            const result = parseXml(`<?xml version="1.0" encoding="utf-8"?>
            <edmx:Edmx Version="4.0" xmlns:edmx="https://docs.oasis-open.org/odata/ns/edmx">
                <edmx:Reference Uri="/sap/opu/odata/sap/SEPMRA_PROD_MAN/$metadata">
                    <edmx:Include Namespace= />
                </edmx:Reference>
            </edmx:Edmx> `);
            expect(result?.references?.length).toStrictEqual(0);
        });

        test(`with namespace value`, () => {
            const result = parseXml(`<?xml version="1.0" encoding="utf-8"?>
            <edmx:Edmx Version="4.0" xmlns:edmx="https://docs.oasis-open.org/odata/ns/edmx">
                <edmx:Reference Uri="/sap/opu/odata/sap/SEPMRA_PROD_MAN/$metadata">
                    <edmx:Include Namespace="SEPMRA_PROD_MAN"/>
                </edmx:Reference>
            </edmx:Edmx> `);
            expect(result?.references).toStrictEqual([
                {
                    name: 'SEPMRA_PROD_MAN',
                    range: Range.create(2, 16, 4, 33),
                    nameRange: Range.create(3, 45, 3, 60),
                    type: 'reference',
                    uri: '/sap/opu/odata/sap/SEPMRA_PROD_MAN/$metadata'
                }
            ]);
        });

        test(`with alias`, () => {
            const result = parseXml(`<?xml version="1.0" encoding="utf-8"?>
            <edmx:Edmx Version="4.0" xmlns:edmx="https://docs.oasis-open.org/odata/ns/edmx">
                <edmx:Reference Uri="/sap/opu/odata/sap/SEPMRA_PROD_MAN/$metadata">
                    <edmx:Include Namespace="SEPMRA_PROD_MAN" Alias="SAP_self" />
                </edmx:Reference>
            </edmx:Edmx> `);
            expect(result?.references).toStrictEqual([
                {
                    alias: 'SAP_self',
                    range: Range.create(2, 16, 4, 33),
                    aliasRange: Range.create(3, 69, 3, 77),
                    name: 'SEPMRA_PROD_MAN',
                    nameRange: Range.create(3, 45, 3, 60),
                    type: 'reference',
                    uri: '/sap/opu/odata/sap/SEPMRA_PROD_MAN/$metadata'
                }
            ]);
        });
    });

    describe('targets', () => {
        test(`empty`, () => {
            const result = parseWithMarkup('<Annotations Target=""></Annotations>');
            expect(result?.targets?.map((node) => node.name)).toStrictEqual(['']);
        });
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
            expect(result?.targets?.[0]?.terms?.[0]?.attributes?.['Term']?.value).toStrictEqual('Test.Term');
        });
    });

    describe('records', () => {
        test('type', () => {
            const result = parseWithMarkup(
                '<Annotations Target="Some.Target"><Annotation Term="Test.Term"><Record Type="CommonSideEffectsType"/></Annotation></Annotations>'
            );

            expect(result?.targets?.[0].terms?.[0].content?.[0]).toStrictEqual({
                name: 'Record',
                attributes: {
                    Type: {
                        name: 'Type',
                        nameRange: Range.create(7, 174, 7, 178),
                        type: 'attribute',
                        value: 'CommonSideEffectsType',
                        valueRange: Range.create(7, 180, 7, 201)
                    }
                },
                content: [],
                nameRange: Range.create(7, 167, 7, 173),
                range: Range.create(7, 166, 7, 204),
                type: 'element'
            });
        });
    });

    describe('invalid', () => {
        test(`empty element name`, () => {
            const result = parseWithMarkup(`
            <Annotations Target="Z2SEPMRA_C_PDproducttype">    
                <Annotation Term="UI.LineItem">    
                    < ></>
                </Annotation>
            </Annotations>`);
            expect(result?.targets[0].terms[0].content[1]).toStrictEqual({
                type: 'element',
                name: '',
                nameRange: Range.create(10, 21, 10, 21),
                range: Range.create(10, 20, 10, 26),
                attributes: {},
                content: []
            });
        });
        test(`missing closing brackets`, () => {
            const result = parseWithMarkup(`
            <Annotations Target="Z2SEPMRA_C_PDproducttype">    
                <Annotation Term="UI.LineItem">    
                    <
                </Annotation>
            </Annotations>`);
            expect(result?.targets[0].terms[0].content[1]).toStrictEqual({
                type: 'element',
                name: '',
                nameRange: Range.create(10, 21, 10, 21),
                range: Range.create(10, 20, 10, 21),
                attributes: {},
                content: []
            });
        });
        test(`not closed element`, () => {
            const result = parseXml(`<?xml version="1.0" encoding="utf-8"?>
            <edmx:Edmx Version="4.0" xmlns:edmx="https://docs.oasis-open.org/odata/ns/edmx">
                <edmx:Reference Uri="/sap/opu/odata/sap/STTA_PROD_MAN/$metadata">
                  <edmx:Include Namespace="Z2SEPMRA_C_PD_PRODUCT_CDS"/>
                </edmx:Reference>
                <edmx:DataServices>
                    <Schema xmlns="https://docs.oasis-open.org/odata/ns/edm" Namespace="manualTest">
                        <Annotations Target="Z2SEPMRA_C_PDproducttype">
                    </Schema>
                </edmx:DataServices>
            </edmx:Edmx> `);
            expect(result?.targets).toStrictEqual([
                {
                    type: 'target',
                    name: 'Z2SEPMRA_C_PDproducttype',
                    nameRange: Range.create(7, 45, 7, 69),
                    terms: [],
                    range: Range.create(7, 24, 8, 29),
                    termsRange: Range.create(7, 71, 8, 20)
                }
            ]);
        });
    });
});
