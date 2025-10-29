import { convertEdmxWithVersion, convertEdmxToConvertedMetadata } from '../../../src/metadata/utils';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import fs from 'fs';
import path from 'path';

describe('metadata utils', () => {
    const validEdmxV4 = fs.readFileSync(
        path.join(__dirname, 'fixtures', 'metadataV4WithAggregateTransforms.xml'),
        'utf-8'
    );

    describe('convertEdmxWithVersion', () => {
        test('should convert valid V4 EDMX and return correct OData version', () => {
            const result = convertEdmxWithVersion(validEdmxV4);

            expect(result).toBeDefined();
            expect(result.convertedMetadata).toBeDefined();
            expect(result.odataVersion).toBe(OdataVersion.v4);
            expect(result.convertedMetadata.version).toBe('4.0');
        });

        test('should handle unparseable OData version gracefully', () => {
            const invalidVersionEdmx = `<?xml version="1.0" encoding="utf-8"?>
                <edmx:Edmx Version="invalid" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
                    <edmx:DataServices>
                        <Schema Namespace="TestService" xmlns="http://docs.oasis-open.org/odata/ns/edm">
                            <EntityContainer Name="Container">
                                <EntitySet Name="TestEntity" EntityType="TestService.TestEntity" />
                            </EntityContainer>
                            <EntityType Name="TestEntity">
                                <Key>
                                    <PropertyRef Name="ID" />
                                </Key>
                                <Property Name="ID" Type="Edm.String" />
                            </EntityType>
                        </Schema>
                    </edmx:DataServices>
                </edmx:Edmx>`;

            expect(() => convertEdmxWithVersion(invalidVersionEdmx)).toThrow('Unparseable OData version');
        });

        test('should handle missing version in metadata', () => {
            const noVersionEdmx = `<?xml version="1.0" encoding="utf-8"?>
                <edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
                    <edmx:DataServices>
                        <Schema Namespace="TestService" xmlns="http://docs.oasis-open.org/odata/ns/edm">
                            <EntityContainer Name="Container">
                                <EntitySet Name="TestEntity" EntityType="TestService.TestEntity" />
                            </EntityContainer>
                            <EntityType Name="TestEntity">
                                <Key>
                                    <PropertyRef Name="ID" />
                                </Key>
                                <Property Name="ID" Type="Edm.String" />
                            </EntityType>
                        </Schema>
                    </edmx:DataServices>
                </edmx:Edmx>`;

            expect(() => convertEdmxWithVersion(noVersionEdmx)).toThrow('Unparseable OData version');
        });

        test('should handle completely invalid EDMX', () => {
            const invalidEdmx = 'This is not valid XML at all';

            expect(() => convertEdmxWithVersion(invalidEdmx)).toThrow('Unable to parse metadata');
        });

        test('should treat version >= 4 as v4', () => {
            const v41Edmx = validEdmxV4.replace('Version="4.0"', 'Version="4.1"');
            
            const result = convertEdmxWithVersion(v41Edmx);
            expect(result.odataVersion).toBe(OdataVersion.v4);
        });

        test('should treat version < 4 as v2', () => {
            const v2Edmx = validEdmxV4.replace('Version="4.0"', 'Version="1.0"');
            
            const result = convertEdmxWithVersion(v2Edmx);
            expect(result.odataVersion).toBe(OdataVersion.v2);
        });
    });

    describe('convertEdmxToConvertedMetadata', () => {
        test('should convert valid EDMX to ConvertedMetadata', () => {
            const result = convertEdmxToConvertedMetadata(validEdmxV4);

            expect(result).toBeDefined();
            expect(result.version).toBe('4.0');
            expect(result.entitySets).toBeDefined();
        });

        test('should throw on invalid EDMX', () => {
            const invalidEdmx = 'This is not valid XML';

            expect(() => convertEdmxToConvertedMetadata(invalidEdmx)).toThrow('Unable to parse metadata');
        });
    });
});