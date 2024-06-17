import { buildAst } from '@xml-tools/ast';
import type { DocumentCstNode } from '@xml-tools/parser';
import { parse } from '@xml-tools/parser';
import type { AnnotationFile } from '@sap-ux/odata-annotation-core-types';

import { convertDocument } from '@sap-ux/xml-odata-annotation-converter';
import { collectUsedNamespaces } from '../../../src/xml/references';

function getEdmxFile(schemaContent: string, references: string = ''): string {
    const referenceContent = references.length ? '\n' + references : '';
    return `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
    <edmx:Reference Uri="/incident/$metadata">
        <edmx:Include Namespace="IncidentService" Alias="Service" />
    </edmx:Reference>${referenceContent}
    <edmx:DataServices>
        <Schema Namespace="Annotations" xmlns="http://docs.oasis-open.org/odata/ns/edm">
            ${schemaContent}
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;
}

function parseXML(text: string): AnnotationFile {
    const { cst, tokenVector } = parse(getEdmxFile(text));

    return convertDocument('', buildAst(cst as DocumentCstNode, tokenVector));
}

describe('collectUsedNamespaces', () => {
    function runTest(fixture: string) {
        const file = parseXML(fixture);
        const result = new Set<string>();
        collectUsedNamespaces(file, result);
        expect(result).toMatchSnapshot();
    }

    test('target namespace', () => {
        runTest(`<Annotations Target="IncidentService.Incident" />`);
    });

    test('target alias', () => {
        runTest(`<Annotations Target="Service.Incident" />`);
    });

    test('term namespace', () => {
        runTest(
            `<Annotations Target="IncidentService.Incident">
                <Annotation Term="com.sap.vocabularies.UI.v1.Hidden" />
            </Annotations>`
        );
    });

    test('enum member', () => {
        runTest(
            `<Annotations Target="IncidentService.Incident">
                <Annotation Term="UI.Hidden" EnumMember="Communication.PhoneType/cel"/>
            </Annotations>`
        );
    });

    test('term alias', () => {
        runTest(`
        <Annotations Target="Service.Incident">
            <Annotation Term="UI.Hidden" />
        </Annotations>`);
    });

    test('embedded term ', () => {
        runTest(`
        <Annotations Target="Service.Incident">
            <Annotation Term="Common.Label" >
                <Annotation Term="UI.Hidden" />
            </Annotation>
        </Annotations>`);
    });

    test('annotation path', () => {
        runTest(`
        <Annotations Target="Service.Incident">
            <Annotation Term="Common.Label" AnnotationPath="@Analytics.AggregatedProperty#TransformationAgg1_min">
            </Annotation>
        </Annotations>`);
    });

    test('record', () => {
        runTest(`
        <Annotations Target="Service.Incident">
            <Annotation Term="UI.PresentationVariant">
                <Record>
                    <PropertyValue Property="SortOrder">
                        <Collection>
                            <Record Type="Common.SortOrderType">
                            </Record>
                        </Collection>
                    </PropertyValue>
                </Record>
            </Annotation>
        </Annotations>`);
    });

    test('annotation path as element', () => {
        runTest(`
        <Annotations Target="Service.Incident">
            <Annotation Term="Common.Label" >
                <AnnotationPath>@Analytics.AggregatedProperty#TransformationAgg1_min"</AnnotationPath>
            </Annotation>
        </Annotations>`);
    });
});
