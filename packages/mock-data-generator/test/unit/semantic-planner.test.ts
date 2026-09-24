import {
    generateService,
    inspectService,
    type MockDataGeneratorOptions,
    type MockDataServiceRequest,
    type SemanticClassifier,
    type SftGenerator
} from '../../src/index.js';
import { LOCATIONS } from '../../src/semantics/sample-catalog.js';

const COUNTRY_CODES = new Set(LOCATIONS.map(({ country }) => country));

const metadata = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
  <edmx:DataServices>
      <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Finance">
      <EntityType Name="Bank">
        <Key><PropertyRef Name="BankCountry"/><PropertyRef Name="BankInternalID"/></Key>
        <Property Name="BankCountry" Type="Edm.String" Nullable="false" MaxLength="3"/>
        <Property Name="BankInternalID" Type="Edm.String" Nullable="false" MaxLength="15"/>
        <Property Name="SWIFTCode" Type="Edm.String" Nullable="false" MaxLength="11"/>
        <Property Name="CountryName" Type="Edm.String" Nullable="false" MaxLength="40"/>
      </EntityType>
      <EntityContainer Name="Container">
        <EntitySet Name="Banks" EntityType="Finance.Bank"/>
      </EntityContainer>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`;

const request: MockDataServiceRequest = {
    metadata: { format: 'edmx', content: metadata },
    service: { urlPath: '/finance', odataVersion: '4.0' },
    targets: [{ name: 'Banks', kind: 'entity-set' }],
    existingData: {}
};

describe('semantic-v2 arbitration', () => {
    it('routes lexical fields while reporting format and sample generation separately', async () => {
        const exactMetadata = `<?xml version="1.0"?>
<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
  <edmx:DataServices>
    <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Finance">
      <EntityType Name="Bank">
        <Key><PropertyRef Name="ID"/></Key>
        <Property Name="ID" Type="Edm.Int32" Nullable="false"/>
        <Property Name="BankCountry" Type="Edm.String" Nullable="false" MaxLength="2"/>
        <Property Name="BankCountryName" Type="Edm.String" Nullable="false" MaxLength="40"/>
        <Property Name="AddressRegion" Type="Edm.String" Nullable="false" MaxLength="3"/>
        <Property Name="BankName" Type="Edm.String" Nullable="false" MaxLength="40"/>
        <Property Name="SWIFTCode" Type="Edm.String" Nullable="false" MaxLength="11"/>
        <Property Name="PhoneNumber1" Type="Edm.String" Nullable="false" MaxLength="30"/>
        <Property Name="CreatedByUserFullName" Type="Edm.String" Nullable="false" MaxLength="80"/>
      </EntityType>
      <EntityContainer Name="Container"><EntitySet Name="Banks" EntityType="Finance.Bank"/></EntityContainer>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`;

        const inspection = await inspectService(
            {
                metadata: { format: 'edmx', content: exactMetadata },
                service: { urlPath: '/exact-banks', odataVersion: '4.0' },
                targets: [{ name: 'Banks', kind: 'entity-set' }],
                existingData: {}
            },
            { pipeline: 'semantic-v2', seed: 101, rowsPerEntity: 4 },
            {},
            { includeGeneratedValues: true }
        );
        const decisions = new Map(inspection.fieldDecisions.map((decision) => [decision.property, decision]));
        const rows = inspection.generatedValues?.Banks ?? [];
        const exactFields = ['BankCountry', 'BankCountryName', 'SWIFTCode', 'PhoneNumber1', 'CreatedByUserFullName'];
        expect(exactFields.filter((property) => decisions.get(property)?.providerState !== 'available')).toEqual([]);
        // The region and bank-name lexical rules contradicted adjudicated labels (status and text
        // fields) on the train/calibration audit and no longer route from wording alone.
        for (const property of ['AddressRegion', 'BankName']) {
            expect(decisions.get(property)?.acceptedRole).toBeUndefined();
        }
        expect(
            rows.every(
                (row) =>
                    /^[A-Z]{2}$/u.test(String(row.BankCountry)) &&
                    /^[A-Z]{6}[A-Z0-9]{2}(?:[A-Z0-9]{3})?$/u.test(String(row.SWIFTCode))
            )
        ).toBe(true);
        expect(
            rows.every((row) => /^\p{L}+[\p{L}'-]*(?: \p{L}+[\p{L}'-]*)+$/u.test(String(row.CreatedByUserFullName)))
        ).toBe(true);
    });

    it('preserves raw classifier abstentions while routing safe lexical decisions', async () => {
        const classifier: SemanticClassifier = {
            fingerprint: 'semantic-v2-arbitration-test',
            classify: async (input) => {
                switch (input.propertyName) {
                    case 'BankCountry':
                        return {
                            role: 'unknown',
                            confidence: 0.97,
                            source: 'unknown',
                            top: [{ role: 'unknown', confidence: 0.97 }]
                        };
                    case 'BankInternalID':
                        return {
                            role: 'bic',
                            confidence: 0.99,
                            source: 'classifier',
                            routeThreshold: 0.9,
                            predictionSetSize: 2,
                            top: [
                                { role: 'bic', confidence: 0.99 },
                                { role: 'bank_account_internal_id', confidence: 0.01 }
                            ]
                        };
                    case 'SWIFTCode':
                        return {
                            role: 'bic',
                            confidence: 0.82,
                            source: 'classifier',
                            routeThreshold: 0.9,
                            predictionSetSize: 2,
                            top: [{ role: 'bic', confidence: 0.82 }]
                        };
                    case 'CountryName':
                        return {
                            role: 'country',
                            confidence: 0.96,
                            source: 'classifier',
                            routeThreshold: 0.9,
                            predictionSetSize: 1,
                            top: [
                                { role: 'country', confidence: 0.96 },
                                { role: 'country_name', confidence: 0.03 }
                            ]
                        };
                    default:
                        return { role: 'unknown', confidence: 1, source: 'unknown' };
                }
            }
        };
        const options = { pipeline: 'semantic-v2', seed: 41, rowsPerEntity: 2 } as unknown as MockDataGeneratorOptions;

        const inspection = await inspectService(request, options, { classifier });
        const decisions = new Map(inspection.fieldDecisions.map((decision) => [decision.property, decision]));

        expect(inspection.pipeline).toBe('semantic-v2');
        expect(inspection.fingerprints).toMatchObject({
            pipeline: 'semantic-v2',
            registry: expect.stringMatching(/^[a-f0-9]{64}$/u),
            catalog: expect.stringMatching(/^[a-f0-9]{64}$/u),
            serializer: expect.stringMatching(/^[a-f0-9]{64}$/u)
        });
        expect(decisions.get('BankCountry')).toMatchObject({
            acceptedRole: 'country',
            abstentionReason: undefined,
            providerState: 'available',
            evidence: { rawCandidate: { role: 'unknown' } }
        });
        expect(decisions.get('BankInternalID')).toMatchObject({
            acceptedRole: undefined,
            abstentionReason: 'conflicting-candidates',
            providerState: 'not-selected'
        });
        expect(decisions.get('SWIFTCode')).toMatchObject({
            acceptedRole: 'bic',
            abstentionReason: undefined,
            providerState: 'available',
            evidence: { rawCandidate: { role: 'bic', confidence: 0.82 } }
        });
        expect(decisions.get('CountryName')).toMatchObject({
            acceptedRole: 'country_name',
            abstentionReason: undefined,
            providerState: 'available',
            evidence: { rawCandidate: { role: 'country', confidence: 0.96 } }
        });
    });

    it('isolates classifier failures to affected fields instead of opening the schema circuit', async () => {
        const classify = jest.fn(async (input: Parameters<SemanticClassifier['classify']>[0]) => {
            if (input.propertyName === 'BankInternalID') {
                throw new Error('local classifier failure');
            }
            if (input.propertyName === 'SWIFTCode') {
                return {
                    role: 'bic',
                    confidence: 0.95,
                    source: 'classifier' as const,
                    routeThreshold: 0.9,
                    predictionSetSize: 1,
                    top: [{ role: 'bic', confidence: 0.95 }]
                };
            }
            return { role: 'unknown', confidence: 1, source: 'unknown' as const };
        });
        const classifier: SemanticClassifier = {
            fingerprint: 'semantic-v2-failure-isolation-test',
            classify
        };

        const inspection = await inspectService(
            request,
            { pipeline: 'semantic-v2', seed: 41, rowsPerEntity: 1 },
            { classifier }
        );
        const decisions = new Map(inspection.fieldDecisions.map((decision) => [decision.property, decision]));

        expect(classify).toHaveBeenCalledTimes(4);
        expect(inspection.diagnostics).toContainEqual(
            expect.objectContaining({ code: 'CLASSIFIER_INFERENCE_FAILED', target: 'Banks.BankInternalID' })
        );
        expect(decisions.get('BankInternalID')).toMatchObject({
            acceptedRole: undefined,
            providerState: 'not-selected'
        });
        expect(decisions.get('SWIFTCode')).toMatchObject({
            acceptedRole: 'bic',
            providerState: 'available'
        });
    });

    it('applies semantic key providers before enforcing composite uniqueness', async () => {
        const classifier: SemanticClassifier = {
            fingerprint: 'semantic-v2-key-test',
            classify: async (input) => {
                const roles: Record<string, string> = {
                    BankCountry: 'country',
                    BankInternalID: 'bank_account_internal_id',
                    SWIFTCode: 'bic'
                };
                const role = roles[input.propertyName] ?? 'unknown';
                return {
                    role,
                    confidence: role === 'unknown' ? 1 : 0.99,
                    source: role === 'unknown' ? ('unknown' as const) : ('classifier' as const),
                    routeThreshold: 0.9,
                    predictionSetSize: 1,
                    top: [{ role, confidence: role === 'unknown' ? 1 : 0.99 }]
                };
            }
        };

        const inspection = await inspectService(
            request,
            { pipeline: 'semantic-v2', seed: 53, rowsPerEntity: 5 },
            { classifier },
            { includeGeneratedValues: true }
        );
        const rows = inspection.generatedValues?.Banks ?? [];

        expect(rows).toHaveLength(5);
        expect(rows.every((row) => typeof row.BankCountry === 'string' && COUNTRY_CODES.has(row.BankCountry))).toBe(
            true
        );
        expect(
            rows.every((row) => typeof row.BankInternalID === 'string' && /^\d{10}$/u.test(row.BankInternalID))
        ).toBe(true);
        expect(new Set(rows.map((row) => `${row.BankCountry}:${row.BankInternalID}`)).size).toBe(5);
    });

    it('offers unresolved narrative and numeric fields to SFT and accepts each valid field on its own', async () => {
        const narrativeMetadata = `<?xml version="1.0"?>
<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
  <edmx:DataServices>
    <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" xmlns:sap="http://www.sap.com/Protocols/SAPData" Namespace="Finance">
      <EntityType Name="Review">
        <Key><PropertyRef Name="ID"/></Key>
        <Property Name="ID" Type="Edm.Int32" Nullable="false"/>
        <Property Name="Description" Type="Edm.String" Nullable="false" MaxLength="40" sap:quickinfo="Flight Reference Scenario:Description"/>
        <Property Name="Notes" Type="Edm.String" Nullable="false" MaxLength="20"/>
        <Property Name="Amount" Type="Edm.Decimal" Nullable="false" Precision="8" Scale="2"/>
      </EntityType>
      <EntityContainer Name="Container"><EntitySet Name="Reviews" EntityType="Finance.Review"/></EntityContainer>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`;
        const narrativeRequest: MockDataServiceRequest = {
            metadata: { format: 'edmx', content: narrativeMetadata },
            service: { urlPath: '/finance/reviews', odataVersion: '4.0' },
            targets: [{ name: 'Reviews', kind: 'entity-set' }],
            existingData: {}
        };
        const classifier: SemanticClassifier = {
            fingerprint: 'semantic-v2-narrative-classifier',
            classify: async () => ({
                role: 'unknown',
                confidence: 0.99,
                source: 'unknown',
                top: [{ role: 'unknown', confidence: 0.99 }]
            })
        };
        const sft: SftGenerator = {
            fingerprint: 'semantic-v2-narrative-sft',
            generate: jest.fn(async () => ({
                rows: [{ Description: 'Flight Reference Scenario:Description', Notes: 'Notes 1', Amount: 12.25 }]
            }))
        };
        const options = { pipeline: 'semantic-v2', seed: 67, rowsPerEntity: 1 } as const;
        const baseline = await generateService(narrativeRequest, options, { classifier });

        const result = await generateService(narrativeRequest, options, { classifier, sft });

        expect(sft.generate).toHaveBeenCalledWith(
            expect.objectContaining({
                contractVersion: 2,
                service: narrativeRequest.service,
                entityName: 'Review',
                siblingGroup: 'residual',
                fixedRows: baseline.resources.Reviews,
                fields: [
                    expect.objectContaining({ name: 'Description', description: expect.any(String) }),
                    expect.objectContaining({ name: 'Notes', description: expect.any(String) }),
                    expect.objectContaining({ name: 'Amount', primitiveType: 'decimal' })
                ]
            }),
            expect.any(AbortSignal)
        );
        const sftInput = (sft.generate as jest.Mock).mock.calls[0][0] as { fields: Array<Record<string, unknown>> };
        expect(sftInput.fields).toContainEqual(expect.objectContaining({ name: 'Amount' }));
        expect(sftInput.fields).not.toContainEqual(expect.objectContaining({ semanticRole: 'unknown' }));
        // The placeholder description keeps its fallback; the valid amount is accepted on its own.
        expect(result.resources.Reviews).toEqual([
            { ...baseline.resources.Reviews[0], Notes: 'Notes 1', Amount: 12.25 }
        ]);
        expect(result.statistics.sft.assignments[0]?.fields.find(({ name }) => name === 'Description')).toMatchObject({
            acceptedSlots: 0,
            invalidSlots: 1
        });
        expect(result.statistics.sft.assignments[0]?.fields.find(({ name }) => name === 'Amount')).toMatchObject({
            acceptedSlots: 1
        });
    });

    it('rejects a row with a semantic-v2 SFT instruction echo as a whole and other placeholders field by field', async () => {
        const metadata = `<?xml version="1.0"?>
<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
  <edmx:DataServices>
    <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Demo">
      <EntityType Name="Review"><Key><PropertyRef Name="ID"/></Key>
        <Property Name="ID" Type="Edm.Int32" Nullable="false"/>
        <Property Name="Description" Type="Edm.String" Nullable="false" MaxLength="200"/>
        <Property Name="Notes" Type="Edm.String" Nullable="false" MaxLength="80"/>
      </EntityType>
      <EntityContainer Name="Container"><EntitySet Name="Reviews" EntityType="Demo.Review"/></EntityContainer>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`;
        const request = {
            metadata: { format: 'edmx' as const, content: metadata },
            service: { urlPath: '/reviews', odataVersion: '4.0' as const },
            targets: [{ name: 'Reviews', kind: 'entity-set' as const }],
            existingData: {}
        };
        const classifier: SemanticClassifier = {
            fingerprint: 'semantic-v2-instruction-echo-classifier',
            classify: async () => ({
                role: 'unknown',
                confidence: 0.99,
                source: 'unknown' as const,
                top: [{ role: 'unknown', confidence: 0.99 }]
            })
        };
        const sft: SftGenerator = {
            fingerprint: 'semantic-v2-instruction-echo-sft',
            generate: jest.fn(async () => ({
                rows: [
                    {
                        Description: 'Return a JSON array containing exactly one object with keys: Description, Notes',
                        Notes: 'A customer requested a revised itinerary.'
                    },
                    {
                        Description: 'The "Description" key should contain a realistic narrative value.',
                        Notes: 'A customer requested a revised itinerary.'
                    },
                    {
                        Description: '/travel_summary',
                        Notes: 'A customer requested a revised itinerary.'
                    },
                    {
                        Description: '/api/v1.0/reviews;BUSINESS&Service:/api/',
                        Notes: 'A customer requested a revised itinerary.'
                    },
                    {
                        Description: 'https://example.test/api/v1.0/reviews?id=2',
                        Notes: 'A customer requested a revised itinerary.'
                    }
                ]
            }))
        };
        const options = { pipeline: 'semantic-v2' as const, seed: 68, rowsPerEntity: 5 };
        const baseline = await generateService(request, options, { classifier });
        const result = await generateService(request, options, { classifier, sft });

        // The two echo rows keep every fallback value; the URL and path descriptions are rejected on
        // their own, so their rows still take the model's notes.
        expect(result.resources.Reviews.slice(0, 2)).toEqual(baseline.resources.Reviews.slice(0, 2));
        expect(result.resources.Reviews.slice(2)).toEqual(
            baseline.resources.Reviews.slice(2).map((row) => ({
                ...row,
                Notes: 'A customer requested a revised itinerary.'
            }))
        );
        expect(result.statistics.sft.acceptedSlots).toBe(3);
    });

    it('derives parent counts and Has flags from final child relationships', async () => {
        const relationshipMetadata = `<?xml version="1.0"?>
<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
    <edmx:DataServices>
        <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Demo">
            <EntityType Name="Parent">
                <Key><PropertyRef Name="ID"/></Key>
                <Property Name="ID" Type="Edm.Int32" Nullable="false"/>
                <Property Name="NumberOfChildren" Type="Edm.Int32" Nullable="false"/>
                <Property Name="HasChildren" Type="Edm.Boolean" Nullable="false"/>
                <NavigationProperty Name="_Children" Type="Collection(Demo.Child)" Partner="_Parent"/>
            </EntityType>
            <EntityType Name="Child">
                <Key><PropertyRef Name="ChildID"/></Key>
                <Property Name="ChildID" Type="Edm.Int32" Nullable="false"/>
                <Property Name="ParentID" Type="Edm.Int32" Nullable="false"/>
                <NavigationProperty Name="_Parent" Type="Demo.Parent" Nullable="false" Partner="_Children">
                    <ReferentialConstraint Property="ParentID" ReferencedProperty="ID"/>
                </NavigationProperty>
            </EntityType>
            <EntityContainer Name="Container">
                <EntitySet Name="Parents" EntityType="Demo.Parent">
                    <NavigationPropertyBinding Path="_Children" Target="Children"/>
                </EntitySet>
                <EntitySet Name="Children" EntityType="Demo.Child">
                    <NavigationPropertyBinding Path="_Parent" Target="Parents"/>
                </EntitySet>
            </EntityContainer>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;

        const result = await generateService(
            {
                metadata: { format: 'edmx', content: relationshipMetadata },
                service: { urlPath: '/parents', odataVersion: '4.0' },
                targets: [
                    { name: 'Parents', kind: 'entity-set' },
                    { name: 'Children', kind: 'entity-set' }
                ],
                existingData: {}
            },
            { pipeline: 'semantic-v2', seed: 71, rowsPerEntity: { Parents: 2, Children: 4 } }
        );

        expect(result.resources.Parents).toEqual([
            expect.objectContaining({ NumberOfChildren: 2, HasChildren: true }),
            expect.objectContaining({ NumberOfChildren: 2, HasChildren: true })
        ]);
        expect(result.resources.Parents.reduce((total, row) => total + Number(row.NumberOfChildren), 0)).toBe(4);
    });

    it('aligns uniquely named child resources by exact shared business keys before deriving counts', async () => {
        const metadata = `<?xml version="1.0"?>
<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
    <edmx:DataServices>
        <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Finance">
            <EntityType Name="CashBank">
                <Key><PropertyRef Name="BankCountry"/><PropertyRef Name="BankInternalID"/></Key>
                <Property Name="BankCountry" Type="Edm.String" Nullable="false" MaxLength="2"/>
                <Property Name="BankInternalID" Type="Edm.String" Nullable="false" MaxLength="10"/>
                <Property Name="NumberOfBusinessPartnerUsed" Type="Edm.Int32" Nullable="false"/>
                <Property Name="NumberOfCompanyCodeUsed" Type="Edm.Int32" Nullable="false"/>
                <Property Name="HasBusinessPartnerUsed" Type="Edm.Boolean" Nullable="false"/>
            </EntityType>
            <EntityType Name="BusinessPartnerUsed">
                <Key><PropertyRef Name="BusinessPartnerNumber"/><PropertyRef Name="BankCountry"/><PropertyRef Name="BankInternalID"/></Key>
                <Property Name="BusinessPartnerNumber" Type="Edm.String" Nullable="false" MaxLength="10"/>
                <Property Name="BankCountry" Type="Edm.String" Nullable="false" MaxLength="2"/>
                <Property Name="BankInternalID" Type="Edm.String" Nullable="false" MaxLength="10"/>
            </EntityType>
            <EntityType Name="CompanyCodeUsed">
                <Key><PropertyRef Name="CompanyCode"/><PropertyRef Name="BankCountry"/><PropertyRef Name="BankInternalID"/></Key>
                <Property Name="CompanyCode" Type="Edm.String" Nullable="false" MaxLength="4"/>
                <Property Name="BankCountry" Type="Edm.String" Nullable="false" MaxLength="2"/>
                <Property Name="BankInternalID" Type="Edm.String" Nullable="false" MaxLength="10"/>
            </EntityType>
            <EntityContainer Name="Container">
                <EntitySet Name="CashBank" EntityType="Finance.CashBank"/>
                <EntitySet Name="BusinessPartnerUsed" EntityType="Finance.BusinessPartnerUsed"/>
                <EntitySet Name="CompanyCodeUsed" EntityType="Finance.CompanyCodeUsed"/>
            </EntityContainer>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;

        const result = await generateService(
            {
                metadata: { format: 'edmx', content: metadata },
                service: { urlPath: '/cash-banks', odataVersion: '4.0' },
                targets: [
                    { name: 'CashBank', kind: 'entity-set' },
                    { name: 'BusinessPartnerUsed', kind: 'entity-set' },
                    { name: 'CompanyCodeUsed', kind: 'entity-set' }
                ],
                existingData: {}
            },
            {
                pipeline: 'semantic-v2',
                seed: 103,
                rowsPerEntity: { CashBank: 2, BusinessPartnerUsed: 4, CompanyCodeUsed: 4 }
            }
        );

        expect(result.resources.CashBank).toEqual([
            expect.objectContaining({
                NumberOfBusinessPartnerUsed: 2,
                NumberOfCompanyCodeUsed: 2,
                HasBusinessPartnerUsed: true
            }),
            expect.objectContaining({
                NumberOfBusinessPartnerUsed: 2,
                NumberOfCompanyCodeUsed: 2,
                HasBusinessPartnerUsed: true
            })
        ]);
    });

    it('enforces creation before change across date and timestamp fields', async () => {
        const auditMetadata = `<?xml version="1.0"?>
<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
    <edmx:DataServices>
        <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Audit">
            <EntityType Name="Record">
                <Key><PropertyRef Name="ID"/></Key>
                <Property Name="ID" Type="Edm.Int32" Nullable="false"/>
                <Property Name="CreatedDate" Type="Edm.Date" Nullable="false"/>
                <Property Name="ChangedDate" Type="Edm.Date" Nullable="false"/>
                <Property Name="CreatedDateTime" Type="Edm.DateTimeOffset" Nullable="false"/>
                <Property Name="ChangedDateTime" Type="Edm.DateTimeOffset" Nullable="false"/>
            </EntityType>
            <EntityContainer Name="Container"><EntitySet Name="Records" EntityType="Audit.Record"/></EntityContainer>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;

        const result = await generateService(
            {
                metadata: { format: 'edmx', content: auditMetadata },
                service: { urlPath: '/audit', odataVersion: '4.0' },
                targets: [{ name: 'Records', kind: 'entity-set' }],
                existingData: {}
            },
            { pipeline: 'semantic-v2', seed: 73, rowsPerEntity: 20 }
        );

        expect(
            result.resources.Records.every(
                (row) =>
                    String(row.CreatedDate) <= String(row.ChangedDate) &&
                    Date.parse(String(row.CreatedDateTime)) <= Date.parse(String(row.ChangedDateTime))
            )
        ).toBe(true);
    });

    it('projects linked code and text fields from an authoritative value-list domain', async () => {
        const valueListMetadata = `<?xml version="1.0"?>
<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
    <edmx:DataServices>
        <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Demo">
            <EntityType Name="Country">
                <Key><PropertyRef Name="Code"/></Key>
                <Property Name="Code" Type="Edm.String" Nullable="false" MaxLength="2"/>
                <Property Name="Name" Type="Edm.String" Nullable="false" MaxLength="40"/>
            </EntityType>
            <EntityType Name="Product">
                <Key><PropertyRef Name="ID"/></Key>
                <Property Name="ID" Type="Edm.Int32" Nullable="false"/>
                <Property Name="CountryCode" Type="Edm.String" Nullable="false" MaxLength="2">
                    <Annotation Term="com.sap.vocabularies.Common.v1.Text" Path="CountryName"/>
                    <Annotation Term="com.sap.vocabularies.Common.v1.ValueList">
                        <Record>
                            <PropertyValue Property="CollectionPath" String="Countries"/>
                            <PropertyValue Property="Parameters">
                                <Collection>
                                    <Record Type="com.sap.vocabularies.Common.v1.ValueListParameterInOut">
                                        <PropertyValue Property="LocalDataProperty" PropertyPath="CountryCode"/>
                                        <PropertyValue Property="ValueListProperty" String="Code"/>
                                    </Record>
                                    <Record Type="com.sap.vocabularies.Common.v1.ValueListParameterOut">
                                        <PropertyValue Property="LocalDataProperty" PropertyPath="CountryName"/>
                                        <PropertyValue Property="ValueListProperty" String="Name"/>
                                    </Record>
                                </Collection>
                            </PropertyValue>
                        </Record>
                    </Annotation>
                </Property>
                <Property Name="CountryName" Type="Edm.String" Nullable="false" MaxLength="40"/>
            </EntityType>
            <EntityContainer Name="Container">
                <EntitySet Name="Countries" EntityType="Demo.Country"/>
                <EntitySet Name="Products" EntityType="Demo.Product"/>
            </EntityContainer>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;

        const result = await generateService(
            {
                metadata: { format: 'edmx', content: valueListMetadata },
                service: { urlPath: '/products', odataVersion: '4.0' },
                targets: [{ name: 'Products', kind: 'entity-set' }],
                existingData: {
                    Countries: {
                        contributor: { present: false },
                        initialRows: {
                            source: 'json',
                            present: true,
                            rows: [
                                { Code: 'DE', Name: 'Deutschland' },
                                { Code: 'IE', Name: 'Ireland' }
                            ]
                        }
                    }
                }
            },
            { pipeline: 'semantic-v2', seed: 79, rowsPerEntity: 4 }
        );

        expect(result.resources.Products.map((row) => [row.CountryCode, row.CountryName])).toEqual([
            ['DE', 'Deutschland'],
            ['IE', 'Ireland'],
            ['DE', 'Deutschland'],
            ['IE', 'Ireland']
        ]);
    });

    it('honors an explicit cross-border banking scenario without country-based bank selection', async () => {
        const bankMetadata = `<?xml version="1.0"?>
        <edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
          <edmx:DataServices>
            <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Finance">
              <EntityType Name="Bank">
                <Key><PropertyRef Name="ID"/></Key>
                <Property Name="ID" Type="Edm.Int32" Nullable="false"/>
                <Property Name="BankCountry" Type="Edm.String" Nullable="false" MaxLength="2"/>
                <Property Name="BankCountryName" Type="Edm.String" Nullable="false" MaxLength="40"/>
                <Property Name="BankName" Type="Edm.String" Nullable="false" MaxLength="40"/>
                <Property Name="SWIFTCode" Type="Edm.String" Nullable="false" MaxLength="11"/>
              </EntityType>
              <EntityContainer Name="Container"><EntitySet Name="Banks" EntityType="Finance.Bank"/></EntityContainer>
            </Schema>
          </edmx:DataServices>
        </edmx:Edmx>`;
        const roles: Record<string, string> = {
            BankCountry: 'country',
            BankCountryName: 'country_name',
            BankName: 'bank_name',
            SWIFTCode: 'bic'
        };
        const classifier: SemanticClassifier = {
            fingerprint: 'semantic-v2-bank-tuple-classifier',
            classify: async (input) => {
                const role = roles[input.propertyName] ?? 'unknown';
                return {
                    role,
                    confidence: 0.99,
                    source: role === 'unknown' ? ('unknown' as const) : ('classifier' as const),
                    routeThreshold: 0.9,
                    predictionSetSize: 1,
                    top: [{ role, confidence: 0.99 }]
                };
            }
        };

        const result = await generateService(
            {
                metadata: { format: 'edmx', content: bankMetadata },
                service: { urlPath: '/banks', odataVersion: '4.0' },
                targets: [{ name: 'Banks', kind: 'entity-set' }],
                existingData: {}
            },
            {
                pipeline: 'semantic-v2',
                seed: 83,
                rowsPerEntity: 4,
                syntheticScenario: {
                    id: 'cross-border-bank',
                    version: '1',
                    domains: {
                        'Banks.BankCountry': ['DE'],
                        'Banks.BankCountryName': ['Deutschland'],
                        'Banks.BankName': ['Independent Bank'],
                        'Banks.SWIFTCode': ['TESTUS00']
                    }
                }
            },
            { classifier }
        );
        expect(
            result.resources.Banks.every(
                (row) =>
                    row.BankCountry === 'DE' &&
                    row.BankCountryName === 'Deutschland' &&
                    row.BankName === 'Independent Bank' &&
                    row.SWIFTCode === 'TESTUS00'
            )
        ).toBe(true);
    });

    it('uses one semantic key domain across a bidirectional parent-child relationship', async () => {
        const cyclicMetadata = `<?xml version="1.0"?>
<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
    <edmx:DataServices>
        <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Finance">
            <EntityType Name="Bank">
                <Key><PropertyRef Name="BankCountry"/><PropertyRef Name="BankInternalID"/><PropertyRef Name="HouseBank"/></Key>
                <Property Name="BankCountry" Type="Edm.String" Nullable="false" MaxLength="2"/>
                <Property Name="BankInternalID" Type="Edm.String" Nullable="false" MaxLength="10"/>
                <Property Name="HouseBank" Type="Edm.String" Nullable="false" MaxLength="5"/>
                <NavigationProperty Name="_Address" Type="Finance.Address" Partner="_Bank"/>
            </EntityType>
            <EntityType Name="Address">
                <Key><PropertyRef Name="BankCountry"/><PropertyRef Name="BankInternalID"/><PropertyRef Name="HouseBank"/></Key>
                <Property Name="BankCountry" Type="Edm.String" Nullable="false" MaxLength="2"/>
                <Property Name="BankInternalID" Type="Edm.String" Nullable="false" MaxLength="10"/>
                <Property Name="HouseBank" Type="Edm.String" Nullable="false" MaxLength="5"/>
                <NavigationProperty Name="_Bank" Type="Finance.Bank" Nullable="false" Partner="_Address">
                    <ReferentialConstraint Property="BankCountry" ReferencedProperty="BankCountry"/>
                    <ReferentialConstraint Property="BankInternalID" ReferencedProperty="BankInternalID"/>
                    <ReferentialConstraint Property="HouseBank" ReferencedProperty="HouseBank"/>
                </NavigationProperty>
            </EntityType>
            <EntityContainer Name="Container">
                <EntitySet Name="Banks" EntityType="Finance.Bank"><NavigationPropertyBinding Path="_Address" Target="Addresses"/></EntitySet>
                <EntitySet Name="Addresses" EntityType="Finance.Address"><NavigationPropertyBinding Path="_Bank" Target="Banks"/></EntitySet>
            </EntityContainer>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;

        const result = await generateService(
            {
                metadata: { format: 'edmx', content: cyclicMetadata },
                service: { urlPath: '/cyclic-banks', odataVersion: '4.0' },
                targets: [
                    { name: 'Banks', kind: 'entity-set' },
                    { name: 'Addresses', kind: 'entity-set' }
                ],
                existingData: {}
            },
            { pipeline: 'semantic-v2', seed: 89, rowsPerEntity: 4 }
        );
        const banks = new Set(result.resources.Banks.map((row) => `${row.BankCountry}:${row.BankInternalID}`));

        expect(result.resources.Addresses).toHaveLength(4);
        expect(result.resources.Addresses.every((row) => banks.has(`${row.BankCountry}:${row.BankInternalID}`))).toBe(
            true
        );
    });

    it('does not let value-list projection overwrite a finalized foreign key', async () => {
        const metadata = `<?xml version="1.0"?>
<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
    <edmx:DataServices>
        <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Demo">
            <EntityType Name="Bank">
                <Key><PropertyRef Name="BankCountry"/></Key>
                <Property Name="BankCountry" Type="Edm.String" Nullable="false" MaxLength="2"/>
            </EntityType>
            <EntityType Name="Rule">
                <Key><PropertyRef Name="RuleID"/></Key>
                <Property Name="RuleID" Type="Edm.Int32" Nullable="false"/>
                <Property Name="BankCountry" Type="Edm.String" Nullable="false" MaxLength="2">
                    <Annotation Term="com.sap.vocabularies.Common.v1.ValueList">
                        <Record>
                            <PropertyValue Property="CollectionPath" String="Countries"/>
                            <PropertyValue Property="Parameters">
                                <Collection><Record><PropertyValue Property="LocalDataProperty" PropertyPath="BankCountry"/><PropertyValue Property="ValueListProperty" String="Code"/></Record></Collection>
                            </PropertyValue>
                        </Record>
                    </Annotation>
                </Property>
                <NavigationProperty Name="_Bank" Type="Demo.Bank" Nullable="false">
                    <ReferentialConstraint Property="BankCountry" ReferencedProperty="BankCountry"/>
                </NavigationProperty>
            </EntityType>
            <EntityType Name="Country"><Key><PropertyRef Name="Code"/></Key><Property Name="Code" Type="Edm.String" Nullable="false" MaxLength="2"/></EntityType>
            <EntityContainer Name="Container">
                <EntitySet Name="Banks" EntityType="Demo.Bank"/>
                <EntitySet Name="Rules" EntityType="Demo.Rule"><NavigationPropertyBinding Path="_Bank" Target="Banks"/></EntitySet>
                <EntitySet Name="Countries" EntityType="Demo.Country"/>
            </EntityContainer>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;

        const result = await generateService(
            {
                metadata: { format: 'edmx', content: metadata },
                service: { urlPath: '/rules', odataVersion: '4.0' },
                targets: [{ name: 'Rules', kind: 'entity-set' }],
                existingData: {
                    Banks: {
                        contributor: { present: false },
                        initialRows: { source: 'json', present: true, rows: [{ BankCountry: 'DE' }] }
                    },
                    Countries: {
                        contributor: { present: false },
                        initialRows: { source: 'json', present: true, rows: [{ Code: 'IE' }] }
                    }
                }
            },
            { pipeline: 'semantic-v2', seed: 97, rowsPerEntity: 3 }
        );

        expect(result.resources.Rules).toHaveLength(3);
        expect(result.resources.Rules.every((row) => row.BankCountry === 'DE')).toBe(true);
        expect(result.diagnostics.some(({ code }) => code === 'SEMANTIC_DOMAIN_CONFLICT')).toBe(true);
    });

    it('does not infer a bank from an authoritative country relationship', async () => {
        const metadata = `<?xml version="1.0"?>
<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
    <edmx:DataServices>
        <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Demo">
            <EntityType Name="Bank">
                <Key><PropertyRef Name="BankCountry"/></Key>
                <Property Name="BankCountry" Type="Edm.String" Nullable="false" MaxLength="2"/>
            </EntityType>
            <EntityType Name="Rule">
                <Key><PropertyRef Name="RuleID"/></Key>
                <Property Name="RuleID" Type="Edm.Int32" Nullable="false"/>
                <Property Name="BankCountry" Type="Edm.String" Nullable="false" MaxLength="2"/>
                <Property Name="BankCountryName" Type="Edm.String" Nullable="false" MaxLength="40"/>
                <Property Name="AddressRegion" Type="Edm.String" Nullable="false" MaxLength="3"/>
                <Property Name="BankName" Type="Edm.String" Nullable="false" MaxLength="40"/>
                <Property Name="SWIFTCode" Type="Edm.String" Nullable="false" MaxLength="11"/>
                <Property Name="PhoneNumber1" Type="Edm.String" Nullable="false" MaxLength="30"/>
                <NavigationProperty Name="_Bank" Type="Demo.Bank" Nullable="false">
                    <ReferentialConstraint Property="BankCountry" ReferencedProperty="BankCountry"/>
                </NavigationProperty>
            </EntityType>
            <EntityContainer Name="Container">
                <EntitySet Name="Banks" EntityType="Demo.Bank"/>
                <EntitySet Name="Rules" EntityType="Demo.Rule"><NavigationPropertyBinding Path="_Bank" Target="Banks"/></EntitySet>
            </EntityContainer>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;

        const result = await generateService(
            {
                metadata: { format: 'edmx', content: metadata },
                service: { urlPath: '/rules', odataVersion: '4.0' },
                targets: [{ name: 'Rules', kind: 'entity-set' }],
                existingData: {
                    Banks: {
                        contributor: { present: false },
                        initialRows: { source: 'json', present: true, rows: [{ BankCountry: 'DE' }] }
                    }
                }
            },
            {
                pipeline: 'semantic-v2',
                seed: 107,
                rowsPerEntity: 4,
                syntheticScenario: {
                    id: 'independent-bank',
                    version: '1',
                    domains: { 'Rules.BankName': ['Independent Bank'], 'Rules.SWIFTCode': ['TESTUS00'] }
                }
            }
        );

        expect(result.resources.Rules).toHaveLength(4);
        expect(
            result.resources.Rules.every(
                (row) =>
                    row.BankCountry === 'DE' &&
                    row.BankName === 'Independent Bank' &&
                    row.SWIFTCode === 'TESTUS00' &&
                    typeof row.PhoneNumber1 === 'string' &&
                    row.PhoneNumber1.startsWith('+')
            )
        ).toBe(true);
    });
});
