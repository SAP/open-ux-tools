import { join } from 'path';
import { pathToFileURL } from 'url';

import type { DocumentCstNode } from '@xml-tools/parser';
import { parse } from '@xml-tools/parser';
import { buildAst } from '@xml-tools/ast';

import { createCdsCompilerFacadeForRoot, getMetadataElementsFromMap } from '@sap/ux-cds-compiler-facade';
import { convertMetadataDocument } from '@sap-ux/xml-odata-annotation-converter';
import { MetadataService } from '@sap-ux/odata-entity-model';

import { convertMetadataToAvtSchema } from '../../../src/avt';

const METADATA_FILE_URL = 'file://metadata.xml';

function prepareV4MetadataService(schemaContent: string): MetadataService {
    const service = new MetadataService({ ODataVersion: '4.0' });
    const { cst, tokenVector } = parse(`<?xml version="1.0" encoding="utf-8"?>
    <edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
        <edmx:DataServices>
            <Schema Namespace="IncidentService" xmlns="http://docs.oasis-open.org/odata/ns/edm">
            ${schemaContent}
            </Schema>
        </edmx:DataServices>
    </edmx:Edmx>`);
    const metadataDocument = buildAst(cst as DocumentCstNode, tokenVector);
    const metadata = convertMetadataDocument(METADATA_FILE_URL, metadataDocument);
    service.import(metadata, METADATA_FILE_URL);
    return service;
}

async function prepareCDSMetadataService(snippet: string): Promise<MetadataService> {
    const fileName = join('app', 'incidents', 'annotations.cds');
    const root = join(__dirname, '..', '..', 'data', 'cds', 'cap-start');

    // prepare file cache
    const filePath = join(root, fileName);
    const fileUri = pathToFileURL(filePath).toString();
    const fileCache = new Map([[fileUri, snippet]]);

    // compile and extract metadata
    const facade = await createCdsCompilerFacadeForRoot(root, [filePath], fileCache);

    const metadataElementMap = facade.getMetadata('IncidentService');
    const metadataElements = getMetadataElementsFromMap(metadataElementMap);

    // create service
    const mdService = new MetadataService({ isCds: true });
    mdService.import(metadataElements, fileUri);

    return mdService;
}

function prepareV2MetadataService(schemaContent: string): MetadataService {
    const service = new MetadataService({ ODataVersion: '2.0' });
    const { cst, tokenVector } = parse(`<?xml version="1.0" encoding="utf-8"?>
    <edmx:Edmx Version="1.0" xmlns:edmx="http://schemas.microsoft.com/ado/2007/06/edmx" xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata" xmlns:sap="http://www.sap.com/Protocols/SAPData">
        <edmx:DataServices m:DataServiceVersion="2.0">
            <Schema Namespace="IncidentService" xmlns="http://docs.oasis-open.org/odata/ns/edm">
            ${schemaContent}
            </Schema>
        </edmx:DataServices>
    </edmx:Edmx>`);
    const metadataDocument = buildAst(cst as DocumentCstNode, tokenVector);
    const metadata = convertMetadataDocument(METADATA_FILE_URL, metadataDocument);
    service.import(metadata, METADATA_FILE_URL);
    return service;
}

describe('avt metadata conversion (XML)', () => {
    test('entity type', () => {
        const service = prepareV4MetadataService(`
        <EntityContainer Name="EntityContainer">
            <EntitySet Name="Incidents" EntityType="IncidentService.Incidents">
            </EntitySet>
        </EntityContainer>
        <EntityType Name="Incidents">
            <Key>
                <PropertyRef Name="ID"/>
            </Key>
            <Property Name="createdAt" Type="Edm.DateTimeOffset" Precision="7"/>
            <Property Name="createdBy" Type="Edm.String" MaxLength="255"/>
            <Property Name="modifiedAt" Type="Edm.DateTimeOffset" Precision="7"/>
            <Property Name="modifiedBy" Type="Edm.String" MaxLength="255"/>
            <Property Name="ID" Type="Edm.Guid" Nullable="false"/>
            <Property Name="identifier" Type="Edm.String" MaxLength="100" Nullable="false"/>
            <Property Name="title" Type="Edm.String" MaxLength="50"/>
        </EntityType>
        <Action Name="closeIncident" IsBound="true">
            <Parameter Name="in" Type="IncidentService.Incidents"/>
        </Action>
        `);
        const schema = convertMetadataToAvtSchema(service);
        expect(schema).toMatchSnapshot();
    });

    test('entity type with navigation', () => {
        const service = prepareV4MetadataService(`
        <EntityContainer Name="EntityContainer">
            <EntitySet Name="Incidents" EntityType="IncidentService.Incidents">
            </EntitySet>
        </EntityContainer>
        <EntityType Name="Incidents">
            <Key>
                <PropertyRef Name="ID"/>
            </Key>
            <Property Name="ID" Type="Edm.Guid" Nullable="false"/>
            <NavigationProperty Name="category" Type="IncidentService.Category">
                <ReferentialConstraint Property="category_code" ReferencedProperty="code"/>
            </NavigationProperty>
        </EntityType>
        <EntityType Name="Category">
            <Key>
                <PropertyRef Name="code"/>
            </Key>
            <Property Name="name" Type="Edm.String" MaxLength="255"/>
        </EntityType>`);
        const schema = convertMetadataToAvtSchema(service);
        expect(schema).toMatchSnapshot();
    });

    test('singleton', () => {
        const service = prepareV4MetadataService(`
            <EntityContainer Name="EntityContainer">
                <EntitySet Name="Incidents" EntityType="IncidentService.Incidents" />
                <Singleton Name="IncidentsFilters" Type="IncidentService.Incidents" >
                    <NavigationPropertyBinding Path="category" Target="Category" />
                </Singleton>
            </EntityContainer>

            <EntityType Name="Incidents">
                <Key>
                    <PropertyRef Name="ID"/>
                </Key>
                <Property Name="ID" Type="Edm.Guid" Nullable="false"/>
                <NavigationProperty Name="category" Type="IncidentService.Category">
                    <ReferentialConstraint Property="category_code" ReferencedProperty="code"/>
                </NavigationProperty>
            </EntityType>

            <EntityType Name="Category">
                <Key>
                    <PropertyRef Name="code"/>
                </Key>
                <Property Name="name" Type="Edm.String" MaxLength="255"/>
            </EntityType>
        `);
        const schema = convertMetadataToAvtSchema(service);
        expect(schema).toMatchSnapshot();
    });

    test('action', () => {
        const service = prepareV4MetadataService(`<Action Name="closeIncident" />`);
        const schema = convertMetadataToAvtSchema(service);
        expect(schema).toMatchSnapshot();
    });

    test('action with return type', () => {
        const service = prepareV4MetadataService(`
        <Action Name="closeIncident" >
            <ReturnType Type="Collection(Edm.String)" />
        </Action>`);
        const schema = convertMetadataToAvtSchema(service);
        expect(schema).toMatchSnapshot();
    });

    test('function and function import V2', () => {
        const service = prepareV2MetadataService(`
        <EntityContainer Name="EntityContainer">
            <EntitySet Name="SEPMRA_C_PD_ProductText" EntityType="IncidentService.SEPMRA_C_PD_ProductTextType" sap:searchable="true" sap:content-version="1"/>
            <FunctionImport Name="SEPMRA_C_PD_ProductTextPreparation" ReturnType="IncidentService.SEPMRA_C_PD_ProductTextType" EntitySet="SEPMRA_C_PD_ProductText" m:HttpMethod="POST" sap:action-for="Z2SEPMRA_C_PD_PRODUCT_CDS.SEPMRA_C_PD_ProductTextType" sap:applicable-path="Preparation_ac">
                <Parameter Name="ProductTextDraftUUID" Type="Edm.Guid" Mode="In"/>
                <Parameter Name="ActiveProduct" Type="Edm.String" Mode="In" MaxLength="10"/>
                <Parameter Name="ActiveLanguage" Type="Edm.String" Mode="In" MaxLength="2"/>
            </FunctionImport>
        </EntityContainer>

        <EntityType Name="SEPMRA_C_PD_ProductTextType" sap:label="Product Text" sap:content-version="1">
            <Key>
                <PropertyRef Name="ProductTextDraftUUID"/>
                <PropertyRef Name="ActiveProduct"/>
                <PropertyRef Name="ActiveLanguage"/>
            </Key>
            <Property Name="ProductTextDraftUUID" Type="Edm.Guid" Nullable="false" sap:label="Text Draft UUID" sap:quickinfo="EPM Fiori Ref Apps: Product Text Draft UUID" sap:creatable="false" sap:updatable="false"/>
            <Property Name="ActiveProduct" Type="Edm.String" Nullable="false" MaxLength="10" sap:display-format="UpperCase" sap:text="Name" sap:label="Product ID" sap:quickinfo="EPM: Product ID" sap:creatable="false" sap:updatable="false"/>
            <Property Name="ActiveLanguage" Type="Edm.String" Nullable="false" MaxLength="2" sap:label="Language" sap:quickinfo="Language Key" sap:creatable="false" sap:updatable="false" sap:value-list="standard"/>
            <Property Name="Language" Type="Edm.String" Nullable="false" MaxLength="2" sap:text="to_Language/Language_Text" sap:label="Language" sap:quickinfo="Language Key" sap:value-list="standard"/>    
        </EntityType>

        <Function Name="SEPMRA_C_PD_ShortProductText" IsBound="true" IsComposable="false">
            <Parameter Name="in" Type="SEPMRA_C_PD_ProductTextType"/>
            <ReturnType Type="Edm.String"/>
        </Function>

        <Function Name="SEPMRA_C_PD_RefreshData" IsBound="false" IsComposable="false">
            <ReturnType Type="Edm.Boolean"/>
        </Function>

        `);
        const schema = convertMetadataToAvtSchema(service);
        expect(schema).toMatchSnapshot();
    });

    test('function and function import V4', () => {
        const service = prepareV4MetadataService(`
        <EntityContainer Name="EntityContainer">
            <EntitySet Name="SEPMRA_C_PD_ProductText" EntityType="IncidentService.SEPMRA_C_PD_ProductTextType" />
            <FunctionImport Name="ProductTextPreparation" EntitySet="SEPMRA_C_PD_ProductText" Function="IncidentService.SEPMRA_C_PD_ProductTextPreparation" />
        </EntityContainer>

        <EntityType Name="SEPMRA_C_PD_ProductTextType" >
            <Key>
                <PropertyRef Name="ProductTextDraftUUID"/>
                <PropertyRef Name="ActiveProduct"/>
                <PropertyRef Name="ActiveLanguage"/>
            </Key>
            <Property Name="ProductTextDraftUUID" Type="Edm.Guid" Nullable="false" />
            <Property Name="ActiveProduct" Type="Edm.String" Nullable="false" MaxLength="10" />
            <Property Name="ActiveLanguage" Type="Edm.String" Nullable="false" MaxLength="2"table="false" />
            <Property Name="Language" Type="Edm.String" Nullable="false" MaxLength="2" />
        </EntityType>

        <Function Name="SEPMRA_C_PD_ProductTextPreparation" IsBound="false" IsComposable="false">
            <Parameter Name="ProductTextDraftUUID" Type="Edm.Guid" Mode="In"/>
            <Parameter Name="ActiveProduct" Type="Edm.String" Mode="In" MaxLength="10"/>
            <Parameter Name="ActiveLanguage" Type="Edm.String" Mode="In" MaxLength="2"/>
            <ReturnType Type="Edm.String"/>
        </Function>
       `);
        const schema = convertMetadataToAvtSchema(service);
        expect(schema).toMatchSnapshot();
    });

    test('action import v2', () => {
        const service = prepareV2MetadataService(`
        <EntityContainer Name="EntityContainer">
            <EntitySet Name="SEPMRA_C_PD_ProductText" EntityType="IncidentService.SEPMRA_C_PD_ProductTextType" sap:searchable="true" sap:content-version="1"/>
            <ActionImport Name="SEPMRA_C_PD_DeleteProductText" EntitySet="SEPMRA_C_PD_ProductText" m:HttpMethod="POST" sap:action-for="IncidentService.SEPMRA_C_PD_ProductTextType">
                <Parameter Name="ProductTextDraftUUID" Type="Edm.Guid" Mode="In"/>
            </ActionImport>
        </EntityContainer>

        <EntityType Name="SEPMRA_C_PD_ProductTextType" sap:label="Product Text" sap:content-version="1">
            <Key>
                <PropertyRef Name="ProductTextDraftUUID"/>
                <PropertyRef Name="ActiveProduct"/>
                <PropertyRef Name="ActiveLanguage"/>
            </Key>
            <Property Name="ProductTextDraftUUID" Type="Edm.Guid" Nullable="false" sap:label="Text Draft UUID" sap:quickinfo="EPM Fiori Ref Apps: Product Text Draft UUID" sap:creatable="false" sap:updatable="false"/>
            <Property Name="ActiveProduct" Type="Edm.String" Nullable="false" MaxLength="10" sap:display-format="UpperCase" sap:text="Name" sap:label="Product ID" sap:quickinfo="EPM: Product ID" sap:creatable="false" sap:updatable="false"/>
            <Property Name="ActiveLanguage" Type="Edm.String" Nullable="false" MaxLength="2" sap:label="Language" sap:quickinfo="Language Key" sap:creatable="false" sap:updatable="false" sap:value-list="standard"/>
            <Property Name="Language" Type="Edm.String" Nullable="false" MaxLength="2" sap:text="to_Language/Language_Text" sap:label="Language" sap:quickinfo="Language Key" sap:value-list="standard"/>    
        </EntityType>
        `);
        const schema = convertMetadataToAvtSchema(service);
        expect(schema).toMatchSnapshot();
    });

    test('action import v4', () => {
        const service = prepareV4MetadataService(`
        <EntityContainer Name="EntityContainer">
            <EntitySet Name="SEPMRA_C_PD_ProductText" EntityType="IncidentService.SEPMRA_C_PD_ProductTextType" />
            <ActionImport Name="RebuildIndexes" Action="IncidentService.SEPMRA_C_PD_RebuildIndexes">
                <Parameter Name="ProductTextDraftUUID" Type="Edm.Guid" Mode="In"/>
            </ActionImport>
        </EntityContainer>

        <EntityType Name="SEPMRA_C_PD_ProductTextType" >
            <Key>
                <PropertyRef Name="ProductTextDraftUUID"/>
                <PropertyRef Name="ActiveProduct"/>
                <PropertyRef Name="ActiveLanguage"/>
            </Key>
            <Property Name="ProductTextDraftUUID" Type="Edm.Guid" Nullable="false" />
            <Property Name="ActiveProduct" Type="Edm.String" Nullable="false" MaxLength="10" />
            <Property Name="ActiveLanguage" Type="Edm.String" Nullable="false" MaxLength="2" />
            <Property Name="Language" Type="Edm.String" Nullable="false" MaxLength="2" />
        </EntityType>

        <Action Name="SEPMRA_C_PD_RebuildIndexes" IsBound="false" IsComposable="false">
            <ReturnType Type="Edm.Boolean"/>
        </Action>
        `);
        const schema = convertMetadataToAvtSchema(service);
        expect(schema).toMatchSnapshot();
    });

    test('bound action import v4', () => {
        const service = prepareV4MetadataService(`
        <EntityType Name="TravelType">
            <Key>
                <PropertyRef Name="TravelUUID"/>
            </Key>
            <Property Name="TravelUUID" Type="Edm.Guid" Nullable="false"/>
            <Property Name="TravelID" Type="Edm.String" Nullable="false" MaxLength="8"/>
        </EntityType>

        <EntityContainer Name="EntityContainer">
            <EntitySet Name="Travel" EntityType="IncidentService.TravelType">
            </EntitySet>
        </EntityContainer>

        <Action Name="Activate" EntitySetPath="_it" IsBound="true">
            <Parameter Name="_it" Type="IncidentService.TravelType" Nullable="false"/>
            <SourceType Type="IncidentService.TravelType" Nullable="false"/>
            <ReturnType Type="IncidentService.TravelType" Nullable="false"/>
        </Action>
        `);
        const schema = convertMetadataToAvtSchema(service);
        expect(schema).toMatchSnapshot();
    });

    test('complex type v2', () => {
        const service = prepareV2MetadataService(`
        <ComplexType Name="ValidationResult">
            <Property Name="IsValid" Type="Edm.Boolean" sap:label="Is valid"/>
        </ComplexType>

        <EntityContainer Name="EntityContainer">
            <EntitySet Name="Incidents" EntityType="IncidentService.Incidents">
            </EntitySet>
        </EntityContainer>
        <EntityType Name="Incidents">
            <Key>
                <PropertyRef Name="ID"/>
            </Key>
            <Property Name="validation" Type="ValidationResult"/>
            <NavigationProperty Name="to_IncodentsFlow" Relationship="IncidentService.assoc_60FC9E64EF14221419561505B7CED3DA" 
                FromRole="FromRole_assoc_60FC9E64EF14221419561505B7CED3DA" ToRole="ToRole_assoc_60FC9E64EF14221419561505B7CED3DA"/>
        </EntityType>

        <EntityType Name="IncidentsFlow">
            <Key>
                <PropertyRef Name="ID"/>
            </Key>
        </EntityType>

        <Association Name="assoc_60FC9E64EF14221419561505B7CED3DA" sap:content-version="1">
            <End Type="IncidentService.Incidents" Multiplicity="1" Role="FromRole_assoc_60FC9E64EF14221419561505B7CED3DA"/>
            <End Type="IncidentService.IncidentsFlow" Multiplicity="*" Role="ToRole_assoc_60FC9E64EF14221419561505B7CED3DA"/>
        </Association>
        `);
        const schema = convertMetadataToAvtSchema(service);
        expect(schema).toMatchSnapshot();
    });

    test('complex type v4', () => {
        const service = prepareV4MetadataService(`
        <ComplexType Name="ValidationResult">
            <Property Name="IsValid" Type="Edm.Boolean" sap:label="Is valid"/>
            <NavigationProperty Name="Flow" Type="IncidentService.IncidentsFlow" />
        </ComplexType>

        <EntityContainer Name="EntityContainer">
            <EntitySet Name="Incidents" EntityType="IncidentService.Incidents">
            </EntitySet>
        </EntityContainer>
        <EntityType Name="Incidents">
            <Key>
                <PropertyRef Name="ID"/>
            </Key>
            <Property Name="validation" Type="IncidentService.ValidationResult"/>
        </EntityType>

        <EntityType Name="IncidentsFlow">
            <Key>
                <PropertyRef Name="ID"/>
            </Key>
            <Property Name="ID" Type="Edm.String" />
        </EntityType>

        `);
        const schema = convertMetadataToAvtSchema(service);
        expect(schema).toMatchSnapshot();
    });
});

describe('avt metadata conversion (CDS)', () => {
    test('entity type', async () => {
        const snippet = `
            Service IncidentService {
                entity Incidents {
                    id: String;
                };
                action MarkIncident(star: Integer);
            }
        `;
        const service = await prepareCDSMetadataService(snippet);
        const schema = convertMetadataToAvtSchema(service);
        expect(schema).toMatchSnapshot();
    });

    test('entity type with navigation', async () => {
        const snippet = `
            service IncidentService {
                entity Incidents {
                    id: String;
                    category: Association to one Category;
                };

                entity Category {
                    key code: Integer;
                };
            }
        `;
        const service = await prepareCDSMetadataService(snippet);
        const schema = convertMetadataToAvtSchema(service);
        expect(schema).toMatchSnapshot();
    });

    test('bound and unbound actions and functions', async () => {
        const snippet = `
            service IncidentService {
                entity Incidents {
                    id: String;
                } actions {
                    action DeleteIncident(id: String);
                    action ReassignIncident(incident: $self, assignee: String) returns Boolean;
                    action CloseAll(in: many $self);
                    function getIncidentCount() returns Integer;
                };
                
                function IntToString(P: Integer) returns String;
                action Cleanup();
            }
        `;
        const service = await prepareCDSMetadataService(snippet);
        const schema = convertMetadataToAvtSchema(service);
        expect(schema).toMatchSnapshot();
    });

    test('singleton', async () => {
        const snippet = `
            service IncidentService {
                @odata.singleton entity IncidentsConfig {
                    id: String;
                }
            }
        `;
        const service = await prepareCDSMetadataService(snippet);
        const schema = convertMetadataToAvtSchema(service);
        expect(schema).toMatchSnapshot();
    });

    test('complex types', async () => {
        const snippet = `
            service IncidentService {
                type ComplexType {
                    real: Decimal default 1;
                    estimated: type of real;
                    step: association to many IncidentWorkflow;
                };
                
                entity Incidents {
                    id: String;
                    data: ComplexType
                };

                entity IncidentWorkflow {
                    key id: String;
                    step: Integer;
                }
            }
        `;
        const service = await prepareCDSMetadataService(snippet);
        const schema = convertMetadataToAvtSchema(service);
        expect(schema).toMatchSnapshot();
    });
});
