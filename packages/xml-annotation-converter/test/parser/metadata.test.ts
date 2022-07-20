import { buildAst } from '@xml-tools/ast';
import type { DocumentCstNode } from '@xml-tools/parser';
import { parse } from '@xml-tools/parser';

import { MetadataElement } from '@sap-ux/odata-metadata';
import type { AnnotationFile, TextNode } from '@sap-ux/odata-annotation-core-types';

import { convertMetadataDocument } from '../../src/parser';

function parseV4(text: string): MetadataElement[] {
    const markup = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" xmlns="http://docs.oasis-open.org/odata/ns/edm">
    <edmx:Reference Uri="../../../../default/iwbep/tea_busi_product/0001/$metadata">
        <edmx:Include Namespace="com.sap.gateway.default.iwbep.tea_busi_product.v0001" Alias="TEA_BUSI_PRODUCT" />
    </edmx:Reference>
    <edmx:Reference Uri="../../../../default/iwbep/tea_busi_supplier/0001/$metadata">
        <edmx:Include Namespace="com.sap.gateway.default.iwbep.tea_busi_supplier.v0001" Alias="TEA_BUSI_SUPPLIER" />
    </edmx:Reference>
    <edmx:Reference Uri="/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Vocabularies(TechnicalName='%2FIWBEP%2FVOC_COMMON',Version='0001',SAP__Origin='LOCAL')/$value">
        <edmx:Include Namespace="com.sap.vocabularies.Common.v1" Alias="SAP__common" />
    </edmx:Reference>
    <edmx:Reference Uri="/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Vocabularies(TechnicalName='%2FIWBEP%2FVOC_MEASURES',Version='0001',SAP__Origin='LOCAL')/$value">
        <edmx:Include Namespace="Org.OData.Measures.V1" Alias="SAP__measures" />
    </edmx:Reference>
    <edmx:Reference Uri="/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Vocabularies(TechnicalName='%2FIWBEP%2FVOC_CORE',Version='0001',SAP__Origin='LOCAL')/$value">
        <edmx:Include Namespace="Org.OData.Core.V1" Alias="SAP__core" />
    </edmx:Reference>
    <edmx:Reference Uri="/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Vocabularies(TechnicalName='%2FIWBEP%2FVOC_CAPABILITIES',Version='0001',SAP__Origin='LOCAL')/$value">
        <edmx:Include Namespace="Org.OData.Capabilities.V1" Alias="SAP__capabilities" />
    </edmx:Reference>
    <edmx:Reference Uri="/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Vocabularies(TechnicalName='%2FIWBEP%2FVOC_AGGREGATION',Version='0001',SAP__Origin='LOCAL')/$value">
        <edmx:Include Namespace="Org.OData.Aggregation.V1" Alias="SAP__aggregation" />
    </edmx:Reference>
    <edmx:Reference Uri="/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Vocabularies(TechnicalName='%2FIWBEP%2FVOC_VALIDATION',Version='0001',SAP__Origin='LOCAL')/$value">
        <edmx:Include Namespace="Org.OData.Validation.V1" Alias="SAP__validation" />
    </edmx:Reference>
    <edmx:Reference Uri="/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Vocabularies(TechnicalName='%2FIWBEP%2FVOC_CODELIST',Version='0001',SAP__Origin='LOCAL')/$value">
        <edmx:Include Namespace="com.sap.vocabularies.CodeList.v1" Alias="SAP__CodeList" />
    </edmx:Reference>
    <edmx:Reference Uri="/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Vocabularies(TechnicalName='%2FIWBEP%2FVOC_UI',Version='0001',SAP__Origin='LOCAL')/$value">
        <edmx:Include Namespace="com.sap.vocabularies.UI.v1" Alias="SAP__UI" />
    </edmx:Reference>
    <edmx:DataServices>
        <Schema Namespace="com.sap.gateway.default.iwbep.tea_busi.v0001" Alias="SAP__self">${text}</Schema>
    </edmx:DataServices>
</edmx:Edmx>`;
    const { cst, tokenVector } = parse(markup);
    const ast = buildAst(cst as DocumentCstNode, tokenVector);
    return convertMetadataDocument('file://metadata.xml', ast);
}

describe('parse', () => {
    describe('metadata', () => {
        test(`EntityType`, () => {
            const result = parseV4(`<EntityType Name="Department">
            <Key>
                <PropertyRef Name="Sector" />
                <PropertyRef Name="ID" />
            </Key>
            <Property Name="Sector" Type="Edm.String" Nullable="false" MaxLength="10" />
            <Property Name="ID" Type="Edm.String" Nullable="false" MaxLength="4" />
            <Property Name="Name" Type="Edm.String" Nullable="false" MaxLength="40" />
            <Property Name="MemberCount" Type="Edm.Int32" Nullable="false" />
            <Property Name="ManagerID" Type="Edm.String" Nullable="false" MaxLength="4" />
            <NavigationProperty Name="DEPARTMENT_2_TEAMS" Type="Collection(com.sap.gateway.default.iwbep.tea_busi.v0001.TEAM)" />
        </EntityType>`);
            expect(result).toMatchInlineSnapshot(`
                Array [
                  Object {
                    "content": Array [
                      Object {
                        "content": Array [],
                        "edmPrimitiveType": "Edm.String",
                        "isAnnotatable": true,
                        "isCollectionValued": false,
                        "isComplexType": false,
                        "isEntityType": false,
                        "kind": "Property",
                        "location": Object {
                          "range": Object {
                            "end": Object {
                              "character": 88,
                              "line": 38,
                            },
                            "start": Object {
                              "character": 12,
                              "line": 38,
                            },
                          },
                          "uri": "file://metadata.xml",
                        },
                        "name": "Sector",
                        "path": "/com.sap.gateway.default.iwbep.tea_busi.v0001.Department/Sector",
                      },
                      Object {
                        "content": Array [],
                        "edmPrimitiveType": "Edm.String",
                        "isAnnotatable": true,
                        "isCollectionValued": false,
                        "isComplexType": false,
                        "isEntityType": false,
                        "kind": "Property",
                        "location": Object {
                          "range": Object {
                            "end": Object {
                              "character": 83,
                              "line": 39,
                            },
                            "start": Object {
                              "character": 12,
                              "line": 39,
                            },
                          },
                          "uri": "file://metadata.xml",
                        },
                        "name": "ID",
                        "path": "/com.sap.gateway.default.iwbep.tea_busi.v0001.Department/ID",
                      },
                      Object {
                        "content": Array [],
                        "edmPrimitiveType": "Edm.String",
                        "isAnnotatable": true,
                        "isCollectionValued": false,
                        "isComplexType": false,
                        "isEntityType": false,
                        "kind": "Property",
                        "location": Object {
                          "range": Object {
                            "end": Object {
                              "character": 86,
                              "line": 40,
                            },
                            "start": Object {
                              "character": 12,
                              "line": 40,
                            },
                          },
                          "uri": "file://metadata.xml",
                        },
                        "name": "Name",
                        "path": "/com.sap.gateway.default.iwbep.tea_busi.v0001.Department/Name",
                      },
                      Object {
                        "content": Array [],
                        "edmPrimitiveType": "Edm.Int32",
                        "isAnnotatable": true,
                        "isCollectionValued": false,
                        "isComplexType": false,
                        "isEntityType": false,
                        "kind": "Property",
                        "location": Object {
                          "range": Object {
                            "end": Object {
                              "character": 77,
                              "line": 41,
                            },
                            "start": Object {
                              "character": 12,
                              "line": 41,
                            },
                          },
                          "uri": "file://metadata.xml",
                        },
                        "name": "MemberCount",
                        "path": "/com.sap.gateway.default.iwbep.tea_busi.v0001.Department/MemberCount",
                      },
                      Object {
                        "content": Array [],
                        "edmPrimitiveType": "Edm.String",
                        "isAnnotatable": true,
                        "isCollectionValued": false,
                        "isComplexType": false,
                        "isEntityType": false,
                        "kind": "Property",
                        "location": Object {
                          "range": Object {
                            "end": Object {
                              "character": 90,
                              "line": 42,
                            },
                            "start": Object {
                              "character": 12,
                              "line": 42,
                            },
                          },
                          "uri": "file://metadata.xml",
                        },
                        "name": "ManagerID",
                        "path": "/com.sap.gateway.default.iwbep.tea_busi.v0001.Department/ManagerID",
                      },
                      Object {
                        "content": Array [],
                        "edmPrimitiveType": "com.sap.gateway.default.iwbep.tea_busi.v0001.TEAM",
                        "isAnnotatable": true,
                        "isCollectionValued": true,
                        "isComplexType": false,
                        "isEntityType": true,
                        "kind": "NavigationProperty",
                        "location": Object {
                          "range": Object {
                            "end": Object {
                              "character": 129,
                              "line": 43,
                            },
                            "start": Object {
                              "character": 12,
                              "line": 43,
                            },
                          },
                          "uri": "file://metadata.xml",
                        },
                        "name": "DEPARTMENT_2_TEAMS",
                        "path": "/com.sap.gateway.default.iwbep.tea_busi.v0001.Department/DEPARTMENT_2_TEAMS",
                        "structuredType": "com.sap.gateway.default.iwbep.tea_busi.v0001.TEAM",
                      },
                    ],
                    "isAnnotatable": true,
                    "isCollectionValued": false,
                    "isComplexType": false,
                    "isEntityType": true,
                    "keys": Array [
                      "Sector",
                      "ID",
                    ],
                    "kind": "EntityType",
                    "location": Object {
                      "range": Object {
                        "end": Object {
                          "character": 21,
                          "line": 44,
                        },
                        "start": Object {
                          "character": 91,
                          "line": 33,
                        },
                      },
                      "uri": "file://metadata.xml",
                    },
                    "name": "com.sap.gateway.default.iwbep.tea_busi.v0001.Department",
                    "path": "/com.sap.gateway.default.iwbep.tea_busi.v0001.Department",
                  },
                ]
            `);
        });
    });
});
