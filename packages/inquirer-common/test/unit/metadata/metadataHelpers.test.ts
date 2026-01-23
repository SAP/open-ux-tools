import { convertEdmxToConvertedMetadata } from '../../../src/metadata';
import { convert } from '@sap-ux/annotation-converter';
import { parse } from '@sap-ux/edmx-parser';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('metadata entity helpers', () => {
    let metadata: ReturnType<typeof convert>;

    beforeAll(() => {
        const edmx = fs.readFileSync(
            path.resolve(__dirname, '../prompts/fixtures/metadataV4WithAggregateTransforms.xml'),
            'utf-8'
        );
        metadata = convert(parse(edmx));
    });

    describe('convertEdmxToConvertedMetadata', () => {
        let validEdmxV4: string;

        beforeAll(() => {
            validEdmxV4 = fs.readFileSync(
                path.resolve(__dirname, '../prompts/fixtures/metadataV4WithAggregateTransforms.xml'),
                'utf-8'
            );
        });

        test('should convert valid EDMX to ConvertedMetadata', () => {
            const result = convertEdmxToConvertedMetadata(validEdmxV4);

            expect(result).toBeDefined();
            expect(result.version).toBe('4.0');
            expect(result.entitySets).toBeInstanceOf(Array);
            expect(result.entitySets.length).toBeGreaterThan(0);
        });

        test('should throw error for invalid EDMX', () => {
            const invalidEdmx = 'invalid xml content';

            expect(() => convertEdmxToConvertedMetadata(invalidEdmx)).toThrow('errors.unparseableMetadata');
        });

        test('should throw error for unparseable OData version', () => {
            const invalidVersionEdmx = `<?xml version="1.0" encoding="utf-8"?>
                <edmx:Edmx Version="invalid" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
                    <edmx:DataServices>
                        <Schema Namespace="com.sap.example" xmlns="http://docs.oasis-open.org/odata/ns/edm">
                            <EntityContainer Name="Container">
                                <EntitySet Name="TestSet" EntityType="com.sap.example.TestEntity"/>
                            </EntityContainer>
                            <EntityType Name="TestEntity">
                                <Key>
                                    <PropertyRef Name="ID"/>
                                </Key>
                                <Property Name="ID" Type="Edm.String" Nullable="false"/>
                            </EntityType>
                        </Schema>
                    </edmx:DataServices>
                </edmx:Edmx>`;

            expect(() => convertEdmxToConvertedMetadata(invalidVersionEdmx)).toThrow('errors.unparseableMetadata');
        });

        test('should throw error for EDMX with no version', () => {
            const noVersionEdmx = `<?xml version="1.0" encoding="utf-8"?>
                <edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
                    <edmx:DataServices>
                        <Schema Namespace="com.sap.example" xmlns="http://docs.oasis-open.org/odata/ns/edm">
                            <EntityContainer Name="Container">
                                <EntitySet Name="TestSet" EntityType="com.sap.example.TestEntity"/>
                            </EntityContainer>
                            <EntityType Name="TestEntity">
                                <Key>
                                    <PropertyRef Name="ID"/>
                                </Key>
                                <Property Name="ID" Type="Edm.String" Nullable="false"/>
                            </EntityType>
                        </Schema>
                    </edmx:DataServices>
                </edmx:Edmx>`;

            expect(() => convertEdmxToConvertedMetadata(noVersionEdmx)).toThrow('errors.unparseableMetadata');
        });

        test('should handle empty string input', () => {
            expect(() => convertEdmxToConvertedMetadata('')).toThrow('errors.unparseableMetadata');
        });

        test('should handle malformed XML', () => {
            const malformedXml = `<?xml version="1.0" encoding="utf-8"?>
                <edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
                    <edmx:DataServices>
                        <Schema Namespace="com.sap.example" xmlns="http://docs.oasis-open.org/odata/ns/edm">
                            <EntityContainer Name="Container">
                                <EntitySet Name="TestSet" EntityType="com.sap.example.TestEntity"/>
                            <!-- Missing closing tags -->
                        </Schema>
                    </edmx:DataServices>`;

            expect(() => convertEdmxToConvertedMetadata(malformedXml)).toThrow('errors.unparseableMetadata');
        });
    });
});
