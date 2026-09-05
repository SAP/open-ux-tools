import { generateService, type SemanticClassifierInput } from '../../src/index.js';

describe('metadata-grounded semantic generation', () => {
    it('uses a CAP label to resolve an opaque property without a learned runtime', async () => {
        const result = await generateService(
            {
                metadata: {
                    format: 'csn',
                    content: JSON.stringify({
                        definitions: {
                            'Demo.Contact': {
                                kind: 'entity',
                                elements: {
                                    ID: { type: 'cds.Integer', key: true, notNull: true },
                                    OpaqueAddress: {
                                        type: 'cds.String',
                                        length: 120,
                                        '@Common.Label': 'E-Mail Address'
                                    }
                                }
                            }
                        }
                    })
                },
                service: { urlPath: '/contacts', odataVersion: '4.0' },
                targets: [{ name: 'Contact', kind: 'entity-set' }],
                existingData: {}
            },
            { rowsPerEntity: 1, seed: 31 }
        );

        expect(result.resources.Contact?.[0]?.OpaqueAddress).toMatch(/^[a-z]+\.[a-z]+@example\.com$/u);
    });

    it.each([
        ['description', { '@Core.Description': 'Primary e-mail address' }],
        ['SAP data element', { '@sap.dataElement': 'AD_SMTPADR' }]
    ])('uses a CAP %s to resolve an opaque property without a learned runtime', async (_source, evidence) => {
        const result = await generateService(
            {
                metadata: {
                    format: 'csn',
                    content: JSON.stringify({
                        definitions: {
                            'Demo.Contact': {
                                kind: 'entity',
                                elements: {
                                    ID: { type: 'cds.Integer', key: true, notNull: true },
                                    Opaque: { type: 'cds.String', length: 120, ...evidence }
                                }
                            }
                        }
                    })
                },
                service: { urlPath: '/contacts', odataVersion: '4.0' },
                targets: [{ name: 'Contact', kind: 'entity-set' }],
                existingData: {}
            },
            { rowsPerEntity: 1, seed: 31 }
        );

        expect(result.resources.Contact?.[0]?.Opaque).toMatch(/^[a-z]+\.[a-z]+@example\.com$/u);
    });

    it('uses SAP V2 property metadata when the technical property name is opaque', async () => {
        const inputs: SemanticClassifierInput[] = [];
        const metadata = `<?xml version="1.0" encoding="utf-8"?>
            <edmx:Edmx xmlns:edmx="http://schemas.microsoft.com/ado/2007/06/edmx" Version="1.0">
                <edmx:DataServices>
                    <Schema xmlns="http://schemas.microsoft.com/ado/2008/09/edm"
                        xmlns:sap="http://www.sap.com/Protocols/SAPData" Namespace="Demo">
                        <EntityType Name="Contact">
                            <Key><PropertyRef Name="ID" /></Key>
                            <Property Name="ID" Type="Edm.Int32" Nullable="false" />
                            <Property Name="Opaque" Type="Edm.String" MaxLength="120"
                                sap:label="E-Mail Address"
                                sap:quickinfo="Primary contact email"
                                sap:data-element="AD_SMTPADR"
                                sap:semantics="email" />
                        </EntityType>
                        <EntityContainer Name="Container">
                            <EntitySet Name="Contacts" EntityType="Demo.Contact" />
                        </EntityContainer>
                    </Schema>
                </edmx:DataServices>
            </edmx:Edmx>`;

        const result = await generateService(
            {
                metadata: { format: 'edmx', content: metadata },
                service: { urlPath: '/contacts', odataVersion: '2.0' },
                targets: [{ name: 'Contacts', kind: 'entity-set' }],
                existingData: {}
            },
            { rowsPerEntity: 1, seed: 31 },
            {
                classifier: {
                    fingerprint: 'v2-metadata-capture-v1',
                    classify: async (input) => {
                        inputs.push(input);
                        return { role: 'unknown', confidence: 0, source: 'unknown' };
                    }
                }
            }
        );

        expect(result.resources.Contacts?.[0]?.Opaque).toMatch(/^[a-z]+\.[a-z]+@example\.com$/u);
        const opaqueInput = inputs.find((input) => input.propertyName === 'Opaque');
        expect(opaqueInput?.label).toBe('E-Mail Address');
        expect(opaqueInput?.description).toBe('Primary contact email');
        expect(opaqueInput?.dataElement).toBe('AD_SMTPADR');
        expect(opaqueInput?.annotations).toContainEqual({ term: 'sap:semantics', value: 'email' });
    });

    it('gives an explicit semantic annotation precedence over misleading lexical metadata', async () => {
        const result = await generateService(
            {
                metadata: {
                    format: 'csn',
                    content: JSON.stringify({
                        definitions: {
                            'Demo.Contact': {
                                kind: 'entity',
                                elements: {
                                    ID: { type: 'cds.Integer', key: true, notNull: true },
                                    StreetAddress: {
                                        type: 'cds.String',
                                        length: 120,
                                        '@Communication.IsEmailAddress': true
                                    }
                                }
                            }
                        }
                    })
                },
                service: { urlPath: '/contacts', odataVersion: '4.0' },
                targets: [{ name: 'Contact', kind: 'entity-set' }],
                existingData: {}
            },
            { rowsPerEntity: 1, seed: 31 },
            {
                classifier: {
                    fingerprint: 'deliberately-wrong-v1',
                    classify: async () => ({
                        role: 'street_address',
                        confidence: 0.99,
                        routeThreshold: 0.5,
                        source: 'classifier'
                    })
                }
            }
        );

        expect(result.resources.Contact?.[0]?.StreetAddress).toMatch(/^[a-z]+\.[a-z]+@example\.com$/u);
    });

    it('resolves V4 external property annotations addressed through a schema alias', async () => {
        const inputs: SemanticClassifierInput[] = [];
        const metadata = `<?xml version="1.0" encoding="utf-8"?>
            <edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
                <edmx:DataServices>
                    <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Demo" Alias="Self">
                        <EntityType Name="BaseContact">
                            <Key><PropertyRef Name="ID" /></Key>
                            <Property Name="ID" Type="Edm.Int32" Nullable="false" />
                            <Property Name="Opaque" Type="Edm.String" MaxLength="120" />
                        </EntityType>
                        <EntityType Name="Contact" BaseType="Self.BaseContact" />
                        <Annotations Target="Self.BaseContact/Opaque">
                            <Annotation Term="com.sap.vocabularies.Common.v1.Label" String="E-Mail Address" />
                            <Annotation Term="com.sap.vocabularies.Core.v1.Description" String="Primary address" />
                            <Annotation Term="SAP.Common.DataElement" String="AD_SMTPADR" />
                            <Annotation Term="Custom.Reference" Path="OtherField" />
                            <Annotation Term="com.sap.vocabularies.Communication.v1.IsEmailAddress" Bool="true" />
                        </Annotations>
                        <EntityContainer Name="Container">
                            <EntitySet Name="Contacts" EntityType="Self.Contact" />
                        </EntityContainer>
                    </Schema>
                </edmx:DataServices>
            </edmx:Edmx>`;

        const result = await generateService(
            {
                metadata: { format: 'edmx', content: metadata },
                service: { urlPath: '/contacts', odataVersion: '4.0' },
                targets: [{ name: 'Contacts', kind: 'entity-set' }],
                existingData: {}
            },
            { rowsPerEntity: 1, seed: 31 },
            {
                classifier: {
                    fingerprint: 'v4-metadata-capture-v1',
                    classify: async (input) => {
                        inputs.push(input);
                        return { role: 'unknown', confidence: 0, source: 'unknown' };
                    }
                }
            }
        );

        expect(result.resources.Contacts?.[0]?.Opaque).toMatch(/^[a-z]+\.[a-z]+@example\.com$/u);
        const opaqueInput = inputs.find((input) => input.propertyName === 'Opaque');
        expect(opaqueInput?.label).toBe('E-Mail Address');
        expect(opaqueInput?.description).toBe('Primary address');
        expect(opaqueInput?.dataElement).toBe('AD_SMTPADR');
        expect(opaqueInput?.annotations).toContainEqual({ term: 'Custom.Reference', value: 'OtherField' });
    });

    it('derives a SAP data element from a V4 DocumentationRef', async () => {
        const metadata = `<?xml version="1.0" encoding="utf-8"?>
            <edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
                <edmx:DataServices>
                    <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Demo">
                        <EntityType Name="Contact">
                            <Key><PropertyRef Name="ID" /></Key>
                            <Property Name="ID" Type="Edm.Int32" Nullable="false" />
                            <Property Name="Opaque" Type="Edm.String" MaxLength="120" />
                        </EntityType>
                        <Annotations Target="Demo.Contact/Opaque">
                            <Annotation Term="Common.DocumentationRef"
                                String="urn:sap-com:documentation:key?=type=DE&amp;id=AD_SMTPADR" />
                        </Annotations>
                        <EntityContainer Name="Container">
                            <EntitySet Name="Contacts" EntityType="Demo.Contact" />
                        </EntityContainer>
                    </Schema>
                </edmx:DataServices>
            </edmx:Edmx>`;

        const result = await generateService(
            {
                metadata: { format: 'edmx', content: metadata },
                service: { urlPath: '/contacts', odataVersion: '4.0' },
                targets: [{ name: 'Contacts', kind: 'entity-set' }],
                existingData: {}
            },
            { rowsPerEntity: 1, seed: 31 }
        );

        expect(result.resources.Contacts?.[0]?.Opaque).toMatch(/^[a-z]+\.[a-z]+@example\.com$/u);
    });

    it('passes all parsed metadata evidence to an injected classifier', async () => {
        const inputs: SemanticClassifierInput[] = [];
        await generateService(
            {
                metadata: {
                    format: 'csn',
                    content: JSON.stringify({
                        definitions: {
                            'Demo.Contact': {
                                kind: 'entity',
                                elements: {
                                    ID: { type: 'cds.Integer', key: true, notNull: true },
                                    Opaque: {
                                        type: 'cds.String',
                                        '@Common.Label': 'Contact channel',
                                        '@Core.Description': 'Primary electronic address',
                                        '@sap.dataElement': 'AD_SMTPADR',
                                        '@Custom.Marker': 'governed'
                                    }
                                }
                            }
                        }
                    })
                },
                service: { urlPath: '/contacts', odataVersion: '4.0' },
                targets: [{ name: 'Contact', kind: 'entity-set' }],
                existingData: {}
            },
            { rowsPerEntity: 1, seed: 31 },
            {
                classifier: {
                    fingerprint: 'metadata-capture-v1',
                    classify: async (input) => {
                        inputs.push(input);
                        return { role: 'unknown', confidence: 0, source: 'unknown' };
                    }
                }
            }
        );

        const opaqueInput = inputs.find((input) => input.propertyName === 'Opaque');
        expect(opaqueInput?.entityName).toBe('Contact');
        expect(opaqueInput?.primitiveType).toBe('string');
        expect(opaqueInput?.label).toBe('Contact channel');
        expect(opaqueInput?.description).toBe('Primary electronic address');
        expect(opaqueInput?.dataElement).toBe('AD_SMTPADR');
        expect(opaqueInput?.annotations).toContainEqual({ term: 'Common.Label', value: 'Contact channel' });
        expect(opaqueInput?.annotations).toContainEqual({
            term: 'Core.Description',
            value: 'Primary electronic address'
        });
        expect(opaqueInput?.annotations).toContainEqual({ term: 'sap.dataElement', value: 'AD_SMTPADR' });
        expect(opaqueInput?.annotations).toContainEqual({ term: 'Custom.Marker', value: 'governed' });
    });
});
