import { buildAst } from '@xml-tools/ast';
import type { DocumentCstNode } from '@xml-tools/parser';
import { parse } from '@xml-tools/parser';

import type { MetadataElement } from '@sap-ux/odata-annotation-core-types';

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

function parseWithMarkup(text: string): MetadataElement[] {
    const markup = `<?xml version="1.0" encoding="utf-8"?>
  <edmx:Edmx Version="4.0"
          xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
      <edmx:DataServices>
          <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Z2SEPMRA_C_PD_PRODUCT_CDS">${text}</Schema>
      </edmx:DataServices>
  </edmx:Edmx>
  `;
    const { cst, tokenVector } = parse(markup);
    const ast = buildAst(cst as DocumentCstNode, tokenVector);
    return convertMetadataDocument('file://annotations.xml', ast);
}

describe('parse', () => {
    describe('metadata', () => {
        test('no root element', () => {
            const markup = ``;
            const { cst, tokenVector } = parse(markup);
            const ast = buildAst(cst as DocumentCstNode, tokenVector);
            const metadata = convertMetadataDocument('file://annotations.xml', ast);
            expect(metadata.length).toBe(0);
        });

        test('schema alias', () => {
            const markup = `<?xml version="1.0" encoding="utf-8"?>
        <edmx:Edmx Version="4.0"
                xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
            <edmx:DataServices>
                <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Z2SEPMRA_C_PD_PRODUCT_CDS" Alias="SAP">
                <EntityContainer Name="Container" />
                </Schema>
            </edmx:DataServices>
        </edmx:Edmx>
        `;
            const { cst, tokenVector } = parse(markup);
            const ast = buildAst(cst as DocumentCstNode, tokenVector);
            const metadata = convertMetadataDocument('file://annotations.xml', ast);
            expect(metadata[0].name).toStrictEqual('Z2SEPMRA_C_PD_PRODUCT_CDS.Container');
            expect(metadata[0].path).toStrictEqual('Z2SEPMRA_C_PD_PRODUCT_CDS.Container');
        });

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
                        "facets": Object {
                          "isNullable": false,
                          "maxLength": 10,
                        },
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
                        "path": "com.sap.gateway.default.iwbep.tea_busi.v0001.Department/Sector",
                        "targetKinds": Array [
                          "Property",
                        ],
                      },
                      Object {
                        "content": Array [],
                        "edmPrimitiveType": "Edm.String",
                        "facets": Object {
                          "isNullable": false,
                          "maxLength": 4,
                        },
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
                        "path": "com.sap.gateway.default.iwbep.tea_busi.v0001.Department/ID",
                        "targetKinds": Array [
                          "Property",
                        ],
                      },
                      Object {
                        "content": Array [],
                        "edmPrimitiveType": "Edm.String",
                        "facets": Object {
                          "isNullable": false,
                          "maxLength": 40,
                        },
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
                        "path": "com.sap.gateway.default.iwbep.tea_busi.v0001.Department/Name",
                        "targetKinds": Array [
                          "Property",
                        ],
                      },
                      Object {
                        "content": Array [],
                        "edmPrimitiveType": "Edm.Int32",
                        "facets": Object {
                          "isNullable": false,
                        },
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
                        "path": "com.sap.gateway.default.iwbep.tea_busi.v0001.Department/MemberCount",
                        "targetKinds": Array [
                          "Property",
                        ],
                      },
                      Object {
                        "content": Array [],
                        "edmPrimitiveType": "Edm.String",
                        "facets": Object {
                          "isNullable": false,
                          "maxLength": 4,
                        },
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
                        "path": "com.sap.gateway.default.iwbep.tea_busi.v0001.Department/ManagerID",
                        "targetKinds": Array [
                          "Property",
                        ],
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
                        "path": "com.sap.gateway.default.iwbep.tea_busi.v0001.Department/DEPARTMENT_2_TEAMS",
                        "referentialConstraints": Array [],
                        "structuredType": "com.sap.gateway.default.iwbep.tea_busi.v0001.TEAM",
                        "targetKinds": Array [
                          "NavigationProperty",
                          "Collection",
                        ],
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
                    "path": "com.sap.gateway.default.iwbep.tea_busi.v0001.Department",
                    "targetKinds": Array [
                      "EntityType",
                    ],
                  },
                ]
            `);
        });

        test(`EntitySet`, () => {
            const result = parseV4(`
              <EntityType Name="DepartmentType">
                <Key>
                    <PropertyRef Name="Sector" />
                    <PropertyRef Name="ID" />
                </Key>
                <Property Name="Sector" Type="Edm.String" Nullable="false" MaxLength="10" />
                <Property Name="ID" Type="Edm.String" Nullable="false" MaxLength="4" />
              </EntityType>
              <EntityContainer Name="TestService">
                <EntitySet Name="Department" EntityType="SAP__self.DepartmentType">
              </EntityContainer>
            `);
            expect(result).toMatchInlineSnapshot(`
                Array [
                  Object {
                    "content": Array [
                      Object {
                        "content": Array [],
                        "edmPrimitiveType": "Edm.String",
                        "facets": Object {
                          "isNullable": false,
                          "maxLength": 10,
                        },
                        "isAnnotatable": true,
                        "isCollectionValued": false,
                        "isComplexType": false,
                        "isEntityType": false,
                        "kind": "Property",
                        "location": Object {
                          "range": Object {
                            "end": Object {
                              "character": 92,
                              "line": 39,
                            },
                            "start": Object {
                              "character": 16,
                              "line": 39,
                            },
                          },
                          "uri": "file://metadata.xml",
                        },
                        "name": "Sector",
                        "path": "com.sap.gateway.default.iwbep.tea_busi.v0001.DepartmentType/Sector",
                        "targetKinds": Array [
                          "Property",
                        ],
                      },
                      Object {
                        "content": Array [],
                        "edmPrimitiveType": "Edm.String",
                        "facets": Object {
                          "isNullable": false,
                          "maxLength": 4,
                        },
                        "isAnnotatable": true,
                        "isCollectionValued": false,
                        "isComplexType": false,
                        "isEntityType": false,
                        "kind": "Property",
                        "location": Object {
                          "range": Object {
                            "end": Object {
                              "character": 87,
                              "line": 40,
                            },
                            "start": Object {
                              "character": 16,
                              "line": 40,
                            },
                          },
                          "uri": "file://metadata.xml",
                        },
                        "name": "ID",
                        "path": "com.sap.gateway.default.iwbep.tea_busi.v0001.DepartmentType/ID",
                        "targetKinds": Array [
                          "Property",
                        ],
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
                          "character": 27,
                          "line": 41,
                        },
                        "start": Object {
                          "character": 14,
                          "line": 34,
                        },
                      },
                      "uri": "file://metadata.xml",
                    },
                    "name": "com.sap.gateway.default.iwbep.tea_busi.v0001.DepartmentType",
                    "path": "com.sap.gateway.default.iwbep.tea_busi.v0001.DepartmentType",
                    "targetKinds": Array [
                      "EntityType",
                    ],
                  },
                  Object {
                    "content": Array [
                      Object {
                        "content": Array [],
                        "isAnnotatable": true,
                        "isCollectionValued": true,
                        "isComplexType": false,
                        "isEntityType": true,
                        "kind": "EntitySet",
                        "location": Object {
                          "range": Object {
                            "end": Object {
                              "character": 32,
                              "line": 44,
                            },
                            "start": Object {
                              "character": 16,
                              "line": 43,
                            },
                          },
                          "uri": "file://metadata.xml",
                        },
                        "name": "Department",
                        "path": "com.sap.gateway.default.iwbep.tea_busi.v0001.TestService/Department",
                        "structuredType": "com.sap.gateway.default.iwbep.tea_busi.v0001.DepartmentType",
                        "targetKinds": Array [
                          "EntitySet",
                          "Collection",
                        ],
                      },
                    ],
                    "isAnnotatable": true,
                    "isCollectionValued": false,
                    "isComplexType": false,
                    "isEntityType": false,
                    "kind": "EntityContainer",
                    "location": Object {
                      "range": Object {
                        "end": Object {
                          "character": 21,
                          "line": 45,
                        },
                        "start": Object {
                          "character": 14,
                          "line": 42,
                        },
                      },
                      "uri": "file://metadata.xml",
                    },
                    "name": "com.sap.gateway.default.iwbep.tea_busi.v0001.TestService",
                    "path": "com.sap.gateway.default.iwbep.tea_busi.v0001.TestService",
                    "targetKinds": Array [
                      "EntityContainer",
                    ],
                  },
                ]
            `);
        });

        test(`Action and Function Import`, () => {
            const result = parseV4(`
            <EntityType Name="DepartmentType">
              <Key>
                  <PropertyRef Name="Sector" />
                  <PropertyRef Name="ID" />
              </Key>
              <Property Name="Sector" Type="Edm.String" Nullable="false" MaxLength="10" />
              <Property Name="ID" Type="Edm.String" Nullable="false" MaxLength="4" />
            </EntityType>

            <EntityContainer Name="TestService">
              <EntitySet Name="Department" EntityType="SAP__self.DepartmentType">
              <ActionImport Name="LeaveRequestApproval" Action="SAP__self.Approval" />
              <FunctionImport Name="ProductsByRating" Function="SAP__self.ProductsByRating" EntitySet="SAP__self.Department" />
              <FunctionImport Name="IsSyncActive" Function="" EntitySet="SAP__self.Department" ReturnType="Edm.Boolean" />
              <FunctionImport Name="GetDepatment" Function="" EntitySet="SAP__self.Department" ReturnType="com.sap.gateway.default.iwbep.tea_busi.v0001.DepartmentType" />
            </EntityContainer>
          `);
            expect(result).toMatchSnapshot();
        });

        test(`Action and Function Import V2`, () => {
            const result = parseV4(`
          <EntityContainer Name="TestService">
            <FunctionImport Name="SEPMRA_C_PD_ProductActivation" ReturnType="SEPMRA_PROD_MAN.SEPMRA_C_PD_ProductType" EntitySet="SEPMRA_C_PD_Product" m:HttpMethod="POST" sap:action-for="SEPMRA_PROD_MAN.SEPMRA_C_PD_ProductType" sap:applicable-path="Activation_ac">
              <Parameter Name="Product" Type="Edm.String" Mode="In" MaxLength="10"/>
              <Parameter Name="DraftUUID" Type="Edm.Guid" Mode="In"/>
              <Parameter Name="IsActiveEntity" Type="Edm.Boolean" Mode="In"/>
            </FunctionImport>
          </EntityContainer>
        `);
            expect(result).toMatchSnapshot();
        });

        test('navigation property', () => {
            const result = parseWithMarkup(
                `<EntityType Name="I_CurrencyType" sap:label="Currency" sap:content-version="1">
              <Key>
                  <PropertyRef Name="Currency"/>
              </Key>
              <Property Name="Currency" Type="Edm.String" Nullable="false" MaxLength="5" sap:label="Currency" sap:quickinfo="Currency Key" sap:semantics="currency-code"/>
              <Property Name="Decimals" Type="Edm.Byte"/>
              <Property Name="CurrencyISOCode" Type="Edm.String" MaxLength="3" sap:display-format="UpperCase" sap:label="ISO code" sap:quickinfo="ISO currency code"/>
          </EntityType>
          <EntityType Name="Z4SEPMRA_C_PD_PRODUCTSALESDATAType" sap:semantics="aggregate" sap:label="Monthly Sales (only recent periods)" sap:content-version="1">
              <Key>
                  <PropertyRef Name="ID"/>
              </Key>
              <Property Name="ID" Type="Edm.String" Nullable="false"/>
              <NavigationProperty Name="to_Currency" Relationship="Z2SEPMRA_C_PD_PRODUCT_CDS.assoc_8A8D8C702E95BDB46603B63C20C04B31" FromRole="FromRole_assoc_8A8D8C702E95BDB46603B63C20C04B31" ToRole="ToRole_assoc_8A8D8C702E95BDB46603B63C20C04B31"/>
          </EntityType>
          <Association Name="assoc_8A8D8C702E95BDB46603B63C20C04B31" sap:content-version="1">
              <End Type="Z2SEPMRA_C_PD_PRODUCT_CDS.Z4SEPMRA_C_PD_PRODUCTSALESDATAType" Multiplicity="1" Role="FromRole_assoc_8A8D8C702E95BDB46603B63C20C04B31"/>
              <End Type="Z2SEPMRA_C_PD_PRODUCT_CDS.I_CurrencyType" Multiplicity="0..1" Role="ToRole_assoc_8A8D8C702E95BDB46603B63C20C04B31"/>
          </Association>`
            );
            expect(
                result
                    .find((element) => element.name === 'Z2SEPMRA_C_PD_PRODUCT_CDS.Z4SEPMRA_C_PD_PRODUCTSALESDATAType')
                    ?.content.find((element) => element.name === 'to_Currency')
            ).toMatchInlineSnapshot(`
                Object {
                  "content": Array [],
                  "isAnnotatable": true,
                  "isCollectionValued": false,
                  "isComplexType": false,
                  "isEntityType": true,
                  "kind": "NavigationProperty",
                  "location": Object {
                    "range": Object {
                      "end": Object {
                        "character": 248,
                        "line": 17,
                      },
                      "start": Object {
                        "character": 14,
                        "line": 17,
                      },
                    },
                    "uri": "file://annotations.xml",
                  },
                  "name": "to_Currency",
                  "path": "Z2SEPMRA_C_PD_PRODUCT_CDS.Z4SEPMRA_C_PD_PRODUCTSALESDATAType/to_Currency",
                  "referentialConstraints": Array [],
                  "structuredType": "Z2SEPMRA_C_PD_PRODUCT_CDS.I_CurrencyType",
                  "targetKinds": Array [
                    "NavigationProperty",
                  ],
                }
            `);
        });

        test('navigation property with constraint', () => {
            const result = parseWithMarkup(
                `<EntityType Name="BookingsType">
                <Key>
                    <PropertyRef Name="UUID"/>
                    <PropertyRef Name="IsActiveEntity"/>
                </Key>
                <Property Name="UUID" Type="Edm.Guid" Nullable="false"/>
                <Property Name="ParentUUID" Type="Edm.Guid" Nullable="false"/>
                <NavigationProperty Name="_Travels" Type="Z2SEPMRA_C_PD_PRODUCT_CDS.TravelsType" Nullable="false" Partner="_Bookings">
                    <ReferentialConstraint Property="ParentUUID" ReferencedProperty="UUID"/>
                </NavigationProperty>
            </EntityType>`
            );
            expect(
                result
                    .find((element) => element.name === 'Z2SEPMRA_C_PD_PRODUCT_CDS.BookingsType')
                    ?.content.find((element) => element.name === '_Travels')
            ).toMatchInlineSnapshot(`
                Object {
                  "content": Array [],
                  "edmPrimitiveType": "Z2SEPMRA_C_PD_PRODUCT_CDS.TravelsType",
                  "facets": Object {
                    "isNullable": false,
                  },
                  "isAnnotatable": true,
                  "isCollectionValued": false,
                  "isComplexType": false,
                  "isEntityType": true,
                  "kind": "NavigationProperty",
                  "location": Object {
                    "range": Object {
                      "end": Object {
                        "character": 37,
                        "line": 13,
                      },
                      "start": Object {
                        "character": 16,
                        "line": 11,
                      },
                    },
                    "uri": "file://annotations.xml",
                  },
                  "name": "_Travels",
                  "path": "Z2SEPMRA_C_PD_PRODUCT_CDS.BookingsType/_Travels",
                  "referentialConstraints": Array [
                    Object {
                      "sourceProperty": "ParentUUID",
                      "sourceTypeName": "Z2SEPMRA_C_PD_PRODUCT_CDS.BookingsType",
                      "targetProperty": "UUID",
                      "targetTypeName": "Z2SEPMRA_C_PD_PRODUCT_CDS.TravelsType",
                    },
                  ],
                  "structuredType": "Z2SEPMRA_C_PD_PRODUCT_CDS.TravelsType",
                  "targetKinds": Array [
                    "NavigationProperty",
                  ],
                }
            `);
        });

        test('property with constraints', () => {
            const result = parseWithMarkup(
                `<EntityType Name="BookingsType">
                <Property Name="Measure" Type="Edm.Double" Nullable="false" Precision="2" Scale="3"/>
                <Property Name="MeasureFloating" Type="Edm.Double" Scale="floating"/>
                <Property Name="MeasureVariable" Type="Edm.Double" Scale="variable"/>
                <Property Name="MeasureWrong" Type="Edm.Double" Scale="wrong"/>
                <Property Name="MeasureDefault" Type="Edm.Int32" DefaultValue="5"/>
                <Property Name="Location" Type="Edm.Int64" SRID="4326"/>
                <Property Name="LocationVariable" Type="Edm.Int64" SRID="variable"/>
                <Property Name="LocationFloating" Type="Edm.Int64" SRID="floating"/>
                <Property Name="Text" Type="Edm.String" Unicode="false"/>
                <Property Name="TextWithUnicode" Type="Edm.String" Unicode="true"/>
            </EntityType>`
            );
            expect(
                result
                    .find((element) => element.name === 'Z2SEPMRA_C_PD_PRODUCT_CDS.BookingsType')
                    ?.content.filter((element) => element.kind === 'Property')
                    .map(({ facets, name }) => ({ name, facets }))
            ).toMatchSnapshot();
        });

        test(`Action`, () => {
            const result = parseV4(`
              <Action Name="CancelRequest" />
              <Action Name="Reindex" IsBound="true">
                <Parameter Name="Table" Type="Edm.String"/>
              </Action>
            `);
            expect(result).toMatchSnapshot();
        });

        test(`Function`, () => {
            const result = parseV4(`
              <ComplexType Name="Employee">
                <Property Name="Name" Nullable="false" Type="Edm.String" />
                <Property Name="Age" Nullable="false" Type="Edm.Decimal" />
                <Property Name="Gender" Nullable="false" Type="Edm.String" />
              </ComplexType>
              <EntityType Name="Department">
                <Key>
                    <PropertyRef Name="Sector" />
                    <PropertyRef Name="ID" />
                </Key>
                <Property Name="Sector" Type="Edm.String" Nullable="false" MaxLength="10" />
                <Property Name="ID" Type="Edm.String" Nullable="false" MaxLength="4" />
                <Property Name="Name" Type="Edm.String" Nullable="false" MaxLength="40" />
              </EntityType>
           
              <Function Name="EmployeeCount" IsBound="true">
                <Parameter Name="Department" Type="Edm.String" />
                <ReturnType Type="Edm.Int32" />
              </Function>

              <Function Name="GetEmployeeData" IsBound="true">
                 <Parameter Name="ID" Type="Edm.String" />
                 <ReturnType Type="Employee" />
              </Function>

              <Function Name="GetDepartmentData" IsBound="true">
                 <Parameter Name="ID" Type="Edm.String" />
                 <ReturnType Type="Department" />
              </Function>
              `);

            expect(result).toMatchSnapshot();
        });

        test('type definition and enum type', () => {
            const result = parseWithMarkup(`
              <TypeDefinition Name="Length" UnderlyingType="Edm.Int32">
                <Annotation Term="Org.OData.Measures.V1.Unit" String="Centimeters" />
              </TypeDefinition>
              <TypeDefinition Name="Width">
                <Annotation Term="Org.OData.Measures.V1.Unit" String="Centimeters" />
              </TypeDefinition>
              <EnumType Name="UnitsOfMeasure">
                <Member Name="Millimeters" />
                <Member Name="Centimeters" />
                <Member Name="Meters" />
              </EnumType>


              <ComplexType Name="Size">
                <Property Name="Height" Type="Length" />
                <Property Name="Width" Type="Width" />
                <Property Name="Units" Type="UnitsOfMeasure">
              </ComplexType>
              `);
            expect(result).toMatchSnapshot();
        });
    });
});
