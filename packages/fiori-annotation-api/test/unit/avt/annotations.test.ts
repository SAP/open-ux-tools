import type { DocumentCstNode } from '@xml-tools/parser';
import { parse } from '@xml-tools/parser';
import { buildAst } from '@xml-tools/ast';

import { convertDocument } from '@sap-ux/xml-odata-annotation-converter';
import type { AnnotationFile } from '@sap-ux/odata-annotation-core-types';

import { convertAnnotationFile } from '../../../src/avt/annotations';

function prepareAnnotationFile(schemaContent: string, references = ''): AnnotationFile {
    const { cst, tokenVector } = parse(`<?xml version="1.0" encoding="utf-8"?>
    <edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
        <edmx:Reference Uri="https://sap.github.io/odata-vocabularies/vocabularies/Common.xml">
            <edmx:Include Namespace="com.sap.vocabularies.Common.v1" Alias="Common"/>
        </edmx:Reference>
        <edmx:Reference Uri="https://sap.github.io/odata-vocabularies/vocabularies/UI.xml">
            <edmx:Include Namespace="com.sap.vocabularies.UI.v1" Alias="UI"/>
        </edmx:Reference>
        <edmx:Reference Uri="https://sap.github.io/odata-vocabularies/vocabularies/Communication.xml">
            <edmx:Include Namespace="com.sap.vocabularies.Communication.v1" Alias="Communication"/>
        </edmx:Reference> ${references}
        <edmx:Reference Uri="/incident/$metadata">
            <edmx:Include Namespace="IncidentService"/>
        </edmx:Reference>
        <edmx:DataServices>
            <Schema Namespace="Annotations" xmlns="http://docs.oasis-open.org/odata/ns/edm">
            ${schemaContent}
            </Schema>
        </edmx:DataServices>
    </edmx:Edmx>
    `);
    const metadataDocument = buildAst(cst as DocumentCstNode, tokenVector);
    return convertDocument('file://annotations.xml', metadataDocument);
}

describe('avt annotation conversion', () => {
    test('UI.LineItem', () => {
        const service = prepareAnnotationFile(`
        <Annotations Target="IncidentService.Incidents">
            <Annotation Term="UI.LineItem">
                <Collection>
                    <Record Type="UI.DataField">
                        <PropertyValue Property="Value" Path="identifier"/>
                    </Record>
                    <Record Type="UI.DataField">
                        <PropertyValue Property="Value" Path="title"/>
                    </Record>
                    <Record Type="UI.DataField">
                        <PropertyValue Property="Value" Path="category_code"/>
                    </Record>
                    <Record Type="UI.DataField">
                        <PropertyValue Property="Value" Path="priority_code"/>
                    </Record>
                    <Record Type="UI.DataField">
                        <PropertyValue Property="Value" Path="incidentStatus_code"/>
                    </Record>
                </Collection>
            </Annotation>
        </Annotations>
        `);
        const schema = convertAnnotationFile(service, 'IncidentService');
        expect(schema).toMatchSnapshot();
        const schemaWithOrigins = convertAnnotationFile(service, 'IncidentService', {
            addOrigins: true,
            mergeSplitAnnotations: false,
            mergeMap: {}
        });
        expect(schemaWithOrigins).toMatchSnapshot();
    });

    test('Apply', () => {
        const service = prepareAnnotationFile(`
        <Annotations Target="IncidentService.Incidents">
            <Annotation Term="UI.LineItem">
                <Collection>
                    <Record Type="UI.DataField">
                        <PropertyValue Property="Value">
                            <Apply Function="odata.concat">
                                <String>Products(</String>
                                <Path>ID</Path>
                                <String>)</String>
                            </Apply>
                        </PropertyValue>
                    </Record>
                    </Record>
                </Collection>
            </Annotation>
        </Annotations>
        `);
        const schema = convertAnnotationFile(service, 'IncidentService');
        expect(schema).toMatchSnapshot();
        const schemaWithOrigins = convertAnnotationFile(service, 'IncidentService', {
            addOrigins: true,
            mergeSplitAnnotations: false,
            mergeMap: {}
        });
        expect(schemaWithOrigins).toMatchSnapshot();
    });

    test('UI.Facets', () => {
        const service = prepareAnnotationFile(`
        <Annotations Target="IncidentService.Incidents">
            <Annotation Term="UI.Facets">
                <Collection>
                    <Record Type="UI.ReferenceFacet">
                        <PropertyValue Property="ID" String="GeneratedFacet1"/>
                        <PropertyValue Property="Label" String="General Information"/>
                        <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#GeneratedGroup1"/>
                    </Record>
                </Collection>
            </Annotation>
        </Annotations>
        `);
        const schema = convertAnnotationFile(service, 'IncidentService');
        expect(schema).toMatchSnapshot();
        const schemaWithOrigins = convertAnnotationFile(service, 'IncidentService', {
            addOrigins: true,
            mergeSplitAnnotations: false,
            mergeMap: {}
        });
        expect(schemaWithOrigins).toMatchSnapshot();
    });

    test('Annotation with qualifier', () => {
        const service = prepareAnnotationFile(`
        <Annotations Target="IncidentService.Incidents/title">
            <Annotation Term="Common.Label" String="Title" Qualifier="Default"/>
        </Annotations>
        `);
        const schema = convertAnnotationFile(service, 'IncidentService');
        expect(schema).toMatchSnapshot();
        const schemaWithOrigins = convertAnnotationFile(service, 'IncidentService', {
            addOrigins: true,
            mergeSplitAnnotations: false,
            mergeMap: {}
        });
        expect(schemaWithOrigins).toMatchSnapshot();
    });

    test('Nested annotations', () => {
        const service = prepareAnnotationFile(`
        <Annotations Target="IncidentService.Incidents/category_code">
            <Annotation Term="Common.Text" Path="category/code">
                <Annotation Term="UI.TextArrangement" EnumMember="UI.TextArrangementType/TextOnly"/>
            </Annotation>
        </Annotations>
        `);
        const schema = convertAnnotationFile(service, 'IncidentService');
        expect(schema).toMatchSnapshot();
        const schemaWithOrigins = convertAnnotationFile(service, 'IncidentService', {
            addOrigins: true,
            mergeSplitAnnotations: false,
            mergeMap: {}
        });
        expect(schemaWithOrigins).toMatchSnapshot();
    });

    test('Data types', () => {
        const service = prepareAnnotationFile(`
        <Annotations Target="IncidentService.Incidents">
            <Annotation Term="UI.LineItem">
                <Collection>
                    <Record Type="UI.DataField">
                        <PropertyValue Property="Value" Decimal="1.0"/>
                    </Record>
                    <Record Type="UI.DataField">
                        <PropertyValue Property="Value" Date="2000-01-01"/>
                    </Record>
                    <Record Type="UI.DataField">
                        <PropertyValue Property="Value" >
                            <Null />
                        </PropertyValue>
                    </Record>
                    <Record Type="UI.DataField">
                        <PropertyValue Property="Value" Int="5"/>
                    </Record>
                </Collection>
            </Annotation>
        </Annotations>
        `);
        const schema = convertAnnotationFile(service, 'IncidentService');
        expect(schema).toMatchSnapshot();
        const schemaWithOrigins = convertAnnotationFile(service, 'IncidentService', {
            addOrigins: true,
            mergeSplitAnnotations: false,
            mergeMap: {}
        });
        expect(schemaWithOrigins).toMatchSnapshot();
    });

    test('Default value', () => {
        const service = prepareAnnotationFile(`
        <Annotations Target="IncidentService.Incidents/createdAt">
            <Annotation Term="UI.HiddenFilter" />
        </Annotations>
        `);
        const schema = convertAnnotationFile(service, 'IncidentService');
        expect(schema).toMatchSnapshot();
        const schemaWithOrigins = convertAnnotationFile(service, 'IncidentService', {
            addOrigins: true,
            mergeSplitAnnotations: false,
            mergeMap: {}
        });
        expect(schemaWithOrigins).toMatchSnapshot();
    });

    describe('merge map', () => {
        test('two properties', () => {
            const service = prepareAnnotationFile(`
            <Annotations Target="IncidentService.Incidents">
                <Annotation Term="UI.HeaderInfo">
                    <Record>
                        <PropertyValue Property="TypeName" String="A" />
                        <Annotation Term="UI.Description" Qualifier="A" String="Something" />
                    </Record>
                </Annotation>
                <Annotation Term="UI.HeaderInfo">
                    <Record>
                        <PropertyValue Property="TypeNamePlural" String="B" />
                        <Annotation Term="UI.Description" Qualifier="B" String="Something" />
                    </Record>
                </Annotation>
            </Annotations>
            `);
            const mergeMap = {};
            const schemaWithOrigins = convertAnnotationFile(service, 'IncidentService', {
                addOrigins: true,
                mergeSplitAnnotations: true,
                mergeMap: mergeMap
            });
            expect(schemaWithOrigins).toMatchSnapshot();
            expect(mergeMap).toMatchSnapshot();
        });
        test('nested records', () => {
            const service = prepareAnnotationFile(`
            <Annotations Target="IncidentService.Incidents">
                <Annotation Term="UI.HeaderInfo">
                    <Record>
                        <PropertyValue Property="Title">
                            <Record>
                                <PropertyValue Property="Value" String="A" />
                                <Annotation Term="UI.Description" Qualifier="A" String="Something" />
                            </Record>
                        </PropertyValue>
                    </Record>
                </Annotation>
                <Annotation Term="UI.HeaderInfo">
                    <Record>
                        <PropertyValue Property="Title">
                            <Record>
                                <PropertyValue Property="Label" String="B" />
                                <Annotation Term="UI.Description" Qualifier="B" String="Something" />
                            </Record>
                        </PropertyValue>
                    </Record>
                </Annotation>
            </Annotations>
            `);
            const mergeMap = {};
            const schemaWithOrigins = convertAnnotationFile(service, 'IncidentService', {
                addOrigins: true,
                mergeSplitAnnotations: true,
                mergeMap: mergeMap
            });
            expect(schemaWithOrigins).toMatchSnapshot();
            expect(mergeMap).toMatchSnapshot();
        });
        test('kpi', () => {
            const service = prepareAnnotationFile(`
            <Annotations Target="IncidentService.Incidents">
                <Annotation Term="UI.KPI">
                    <Record>
                        <PropertyValue Property="DataPoint">
                            <Record>
                                <PropertyValue Property="Value" String="A" />
                                <Annotation Term="UI.Description" Qualifier="A" String="Something" />
                            </Record>
                        </PropertyValue>
                    </Record>
                </Annotation>
                <Annotation Term="UI.KPI">
                    <Record>
                        <PropertyValue Property="DataPoint">
                            <Record>
                                <PropertyValue Property="Responsible">
                                    <Record>
                                        <PropertyValue Property="nickname" String="B" />
                                    </Record>
                                </PropertyValue>
                                <PropertyValue Property="Responsible">
                                    <Record>
                                        <PropertyValue Property="fn" String="V" />
                                    </Record>
                                </PropertyValue>
                                <Annotation Term="UI.Description" Qualifier="F" String="F" />
                            </Record>
                        </PropertyValue>
                    </Record>
                </Annotation>
            </Annotations>
            `);
            const mergeMap = {};
            const schemaWithOrigins = convertAnnotationFile(service, 'IncidentService', {
                addOrigins: true,
                mergeSplitAnnotations: true,
                mergeMap: mergeMap
            });
            expect(schemaWithOrigins).toMatchSnapshot();
            expect(mergeMap).toMatchSnapshot();
        });
        test('split annotation', () => {
            const service = prepareAnnotationFile(`
            <Annotations Target="IncidentService.Incidents">
                <Annotation Term="UI.HeaderInfo">
                    <Record>
                        <PropertyValue Property="Title">
                            <Record>
                                <PropertyValue Property="Value" String="A" />
                            </Record>
                        </PropertyValue>
                    </Record>
                </Annotation>
                <Annotation Term="UI.HeaderInfo">
                    <Record>
                        <PropertyValue Property="Title">
                            <Record>
                                <Annotation Term="UI.Description" Qualifier="B" String="Something" />
                            </Record>
                        </PropertyValue>
                    </Record>
                </Annotation>
            </Annotations>
            `);
            const mergeMap = {};
            const schemaWithOrigins = convertAnnotationFile(service, 'IncidentService', {
                addOrigins: true,
                mergeSplitAnnotations: true,
                mergeMap: mergeMap
            });
            expect(schemaWithOrigins).toMatchSnapshot();
            expect(mergeMap).toMatchSnapshot();
        });
        test('embedded annotations', () => {
            const service = prepareAnnotationFile(`
            <Annotations Target="IncidentService.Incidents/modifiedAt">
                <Annotation Term="Common.Text" String="A">
                </Annotation>
                <Annotation Term="Common.Text">
                    <Annotation Term="UI.TextArrangement"  String="Something" />
                </Annotation>
            </Annotations>
            `);
            const mergeMap = {};
            const schemaWithOrigins = convertAnnotationFile(service, 'IncidentService', {
                addOrigins: true,
                mergeSplitAnnotations: true,
                mergeMap: mergeMap
            });
            expect(schemaWithOrigins).toMatchSnapshot();
            expect(mergeMap).toMatchSnapshot();
        });
        test('embedded annotation overrides', () => {
            const service = prepareAnnotationFile(`
            <Annotations Target="IncidentService.Incidents/modifiedAt">
                <Annotation Term="Common.Text" String="A">
                    <Annotation Term="UI.TextArrangement" String="Something" />
                </Annotation>
                <Annotation Term="Common.Text">
                    <Annotation Term="UI.TextArrangement" String="two" />
                </Annotation>
                <Annotation Term="Common.Text">
                    <Annotation Term="UI.TextArrangement" Qualifier="two" String="Something" />
                </Annotation>
            </Annotations>
            `);
            const mergeMap = {};
            const schemaWithOrigins = convertAnnotationFile(service, 'IncidentService', {
                addOrigins: true,
                mergeSplitAnnotations: true,
                mergeMap: mergeMap
            });
            expect(schemaWithOrigins).toMatchSnapshot();
            expect(mergeMap).toMatchSnapshot();
        });
    });
    test('Default Property value', () => {
        const references = `
        <edmx:Reference Uri="https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Capabilities.V1.xml">
            <edmx:Include Namespace="Org.OData.Capabilities.V1" Alias="Capabilities"/>
        </edmx:Reference>`;
        const service = prepareAnnotationFile(
            `
        <Annotations Target="IncidentService.Incidents">
            <Annotation Term="Capabilities.UpdateRestrictions">
                <Record>
                    <PropertyValue Property="Updatable" />
                </Record>
            </Annotations>
        </Annotations>
        `,
            references
        );
        const schema = convertAnnotationFile(service, 'IncidentService');
        expect(schema).toMatchSnapshot();
        const schemaWithOrigins = convertAnnotationFile(service, 'IncidentService', {
            addOrigins: true,
            mergeSplitAnnotations: false,
            mergeMap: {}
        });
        expect(schemaWithOrigins).toMatchSnapshot();
    });
    test('Unbound action', () => {
        const service = prepareAnnotationFile(
            `
        <Annotations Target="IncidentService.FuGetEmployeeByID(Edm.String)">
            <Annotation Term="Common.Label" String="Available Product"/>
        </Annotations>
        `
        );
        const schema = convertAnnotationFile(service, 'IncidentService');
        expect(schema).toMatchSnapshot();
        const schemaWithOrigins = convertAnnotationFile(service, 'IncidentService', {
            addOrigins: true,
            mergeSplitAnnotations: false,
            mergeMap: {}
        });
        expect(schemaWithOrigins).toMatchSnapshot();
    });
});
