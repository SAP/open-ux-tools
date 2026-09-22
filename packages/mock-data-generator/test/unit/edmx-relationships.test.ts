import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { generateService, inspectService } from '../../src/index.js';

const v4Metadata = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
  <edmx:DataServices>
    <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Catalog">
      <EntityType Name="Category">
        <Key><PropertyRef Name="ID"/></Key>
        <Property Name="ID" Type="Edm.Int32" Nullable="false"/>
      </EntityType>
      <EntityType Name="Book">
        <Key><PropertyRef Name="ID"/></Key>
        <Property Name="ID" Type="Edm.Int32" Nullable="false"/>
        <Property Name="CategoryID" Type="Edm.Int32" Nullable="false"/>
        <NavigationProperty Name="category" Type="Catalog.Category" Nullable="false">
          <ReferentialConstraint Property="CategoryID" ReferencedProperty="ID"/>
        </NavigationProperty>
      </EntityType>
      <EntityContainer Name="Container">
        <EntitySet Name="Categories" EntityType="Catalog.Category"/>
        <EntitySet Name="Books" EntityType="Catalog.Book">
          <NavigationPropertyBinding Path="category" Target="Categories"/>
        </EntitySet>
      </EntityContainer>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`;

const v2Metadata = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx xmlns:edmx="http://schemas.microsoft.com/ado/2007/06/edmx" Version="1.0">
  <edmx:DataServices>
    <Schema xmlns="http://schemas.microsoft.com/ado/2008/09/edm" Namespace="Catalog">
      <EntityType Name="Category">
        <Key><PropertyRef Name="ID"/></Key>
        <Property Name="ID" Type="Edm.Int32" Nullable="false"/>
      </EntityType>
      <EntityType Name="Book">
        <Key><PropertyRef Name="ID"/></Key>
        <Property Name="ID" Type="Edm.Int32" Nullable="false"/>
        <Property Name="CategoryID" Type="Edm.Int32" Nullable="false"/>
        <NavigationProperty Name="category" Relationship="Catalog.Book_Category" FromRole="Book" ToRole="Category"/>
      </EntityType>
      <Association Name="Book_Category">
        <End Type="Catalog.Book" Role="Book" Multiplicity="*"/>
        <End Type="Catalog.Category" Role="Category" Multiplicity="1"/>
        <ReferentialConstraint>
          <Principal Role="Category"><PropertyRef Name="ID"/></Principal>
          <Dependent Role="Book"><PropertyRef Name="CategoryID"/></Dependent>
        </ReferentialConstraint>
      </Association>
      <EntityContainer Name="Container">
        <EntitySet Name="Categories" EntityType="Catalog.Category"/>
        <EntitySet Name="Books" EntityType="Catalog.Book"/>
      </EntityContainer>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`;

describe.each([
    ['V4', v4Metadata, '4.0' as const],
    ['V2', v2Metadata, '2.0' as const]
])('%s EDMX relationships', (_label, metadata, odataVersion) => {
    test('resolves generated foreign keys against authoritative parent rows', async () => {
        const result = await generateService(
            {
                metadata: { format: 'edmx', content: metadata },
                service: { urlPath: '/catalog', odataVersion },
                targets: [{ name: 'Books', kind: 'entity-set' }],
                existingData: {
                    Categories: {
                        contributor: { present: false },
                        initialRows: {
                            source: 'json',
                            present: true,
                            rows: [{ ID: 101 }, { ID: 303 }]
                        }
                    }
                }
            },
            { rowsPerEntity: 4, seed: 7 }
        );

        expect(result.resources.Books).toHaveLength(4);
        expect(result.resources.Books?.map((row) => row.CategoryID)).toEqual([101, 303, 101, 303]);
    });
});

test('reduces generated dependants when an authoritative required parent domain is empty', async () => {
    const result = await generateService(
        {
            metadata: { format: 'edmx', content: v4Metadata },
            service: { urlPath: '/catalog', odataVersion: '4.0' },
            targets: [{ name: 'Books', kind: 'entity-set' }],
            existingData: {
                Categories: {
                    contributor: { present: false },
                    initialRows: { source: 'json', present: true, rows: [] }
                }
            }
        },
        { rowsPerEntity: 2 }
    );

    expect(result.resources.Books).toEqual([]);
    expect(result.diagnostics).toContainEqual(
        expect.objectContaining({
            code: 'ROW_COUNT_REDUCED_UNSATISFIABLE_REFERENCE_DOMAIN',
            target: 'Books'
        })
    );
});

test('infers an unconstrained navigation only from exact target-key name and type matches', async () => {
    const metadata = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
  <edmx:DataServices>
    <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Finance">
      <EntityType Name="Bank">
        <Key><PropertyRef Name="BankCountry"/><PropertyRef Name="BankInternalID"/></Key>
        <Property Name="BankCountry" Type="Edm.String" Nullable="false" MaxLength="3"/>
        <Property Name="BankInternalID" Type="Edm.String" Nullable="false" MaxLength="15"/>
      </EntityType>
      <EntityType Name="BankAddress">
        <Key><PropertyRef Name="AddressID"/></Key>
        <Property Name="AddressID" Type="Edm.Int32" Nullable="false"/>
        <Property Name="BankCountry" Type="Edm.String" Nullable="false" MaxLength="3"/>
        <Property Name="BankInternalID" Type="Edm.String" Nullable="false" MaxLength="15"/>
        <NavigationProperty Name="_Bank" Type="Finance.Bank" Nullable="false"/>
      </EntityType>
      <EntityContainer Name="Container">
        <EntitySet Name="Banks" EntityType="Finance.Bank"/>
        <EntitySet Name="BankAddresses" EntityType="Finance.BankAddress">
          <NavigationPropertyBinding Path="_Bank" Target="Banks"/>
        </EntitySet>
      </EntityContainer>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`;

    const inspection = await inspectService(
        {
            metadata: { format: 'edmx', content: metadata },
            service: { urlPath: '/finance', odataVersion: '4.0' },
            targets: [
                { name: 'Banks', kind: 'entity-set' },
                { name: 'BankAddresses', kind: 'entity-set' }
            ],
            existingData: {}
        },
        { pipeline: 'semantic-v2', rowsPerEntity: 2, seed: 31 }
    );

    expect(inspection.relationships).toContainEqual({
        name: '_Bank',
        fromResource: 'BankAddresses',
        toResource: 'Banks',
        mappings: [
            { sourceProperty: 'BankCountry', targetProperty: 'BankCountry' },
            { sourceProperty: 'BankInternalID', targetProperty: 'BankInternalID' }
        ],
        provenance: 'inferred',
        confidence: 0.8
    });
    expect(inspection.invariants).toContainEqual({ name: 'relationships', passed: true });
});

test('recovers the finance fixture explicit and uniquely inferred foreign-key mappings', async () => {
    const metadata = await readFile(new URL('./finance-manage.metadata.xml', import.meta.url), 'utf8');
    expect(createHash('sha256').update(metadata).digest('hex')).toBe(
        'bed9c40cdaee6d6abfb4ec1948ed6b1b4deebd9b3f42c579c654a2d726483e1e'
    );

    const inspection = await inspectService(
        {
            metadata: { format: 'edmx', content: metadata },
            service: { urlPath: '/cash-bank-manage', odataVersion: '4.0' },
            targets: [{ name: 'UserContactCard', kind: 'entity-set' }],
            existingData: {}
        },
        { pipeline: 'semantic-v2', rowsPerEntity: 1, seed: 31 }
    );
    const mappingCount = (provenance: 'explicit' | 'inferred') =>
        inspection.relationships
            .filter((relationship) => relationship.provenance === provenance)
            .reduce((total, relationship) => total + relationship.mappings.length, 0);

    expect(inspection.sourceOwnership).toHaveLength(1);
    expect(
        inspection.fieldDecisions.map((decision) => decision.resource).filter((name) => name === 'CashBank')
    ).not.toHaveLength(0);
    expect(mappingCount('explicit')).toBe(16);
    expect(mappingCount('inferred')).toBe(10);
    expect(inspection.relationships).toEqual(
        expect.arrayContaining([
            expect.objectContaining({
                name: '_BankAddress',
                fromResource: 'CashBank',
                toResource: 'BankAddress',
                provenance: 'inferred'
            }),
            expect.objectContaining({
                name: '_BankIntradayStatementRule',
                fromResource: 'CashBank',
                toResource: 'BankIntradayStatementRule',
                provenance: 'inferred'
            }),
            expect.objectContaining({
                name: '_DtaMdmExchFrgnPaytTransac',
                fromResource: 'CashBankHouseBank',
                toResource: 'DtaMdmExchFrgnPaytTransac',
                provenance: 'inferred'
            }),
            expect.objectContaining({
                name: '_Bank',
                fromResource: 'CashBankRelatedBranch',
                toResource: 'CashBank',
                provenance: 'explicit'
            }),
            expect.objectContaining({
                name: '_Bank',
                fromResource: 'CashBankServiceMapping',
                toResource: 'CashBank',
                provenance: 'explicit'
            }),
            expect.objectContaining({
                name: '_Bank',
                fromResource: 'CashBankNettingPartner',
                toResource: 'CashBank',
                provenance: 'explicit'
            })
        ])
    );
});

test('generates exactly one row for an EDMX singleton target', async () => {
    const singletonMetadata = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
  <edmx:DataServices>
    <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Catalog">
      <EntityType Name="User">
        <Key><PropertyRef Name="ID"/></Key>
        <Property Name="ID" Type="Edm.Int32" Nullable="false"/>
        <Property Name="DisplayName" Type="Edm.String" Nullable="false"/>
      </EntityType>
      <EntityContainer Name="Container">
        <Singleton Name="Me" Type="Catalog.User"/>
      </EntityContainer>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`;

    const result = await generateService({
        metadata: { format: 'edmx', content: singletonMetadata },
        service: { urlPath: '/catalog', odataVersion: '4.0' },
        targets: [{ name: 'Me', kind: 'singleton' }],
        existingData: {}
    });

    expect(result.resources.Me).toHaveLength(1);
    expect(result.resources.Me?.[0]).toEqual(expect.objectContaining({ ID: 1 }));
});

test('skips declared complex properties instead of rejecting every scalar field in the service', async () => {
    const complexMetadata = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
  <edmx:DataServices>
    <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Catalog">
      <ComplexType Name="Address"><Property Name="City" Type="Edm.String"/></ComplexType>
      <EntityType Name="User">
        <Key><PropertyRef Name="ID"/></Key>
        <Property Name="ID" Type="Edm.Int32" Nullable="false"/>
        <Property Name="Address" Type="Catalog.Address"/>
      </EntityType>
      <EntityContainer Name="Container"><EntitySet Name="Users" EntityType="Catalog.User"/></EntityContainer>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`;

    const result = await generateService(
        {
            metadata: { format: 'edmx', content: complexMetadata },
            service: { urlPath: '/catalog', odataVersion: '4.0' },
            targets: [{ name: 'Users', kind: 'entity-set' }],
            existingData: {}
        },
        { rowsPerEntity: 1 }
    );

    expect(result.resources.Users).toEqual([{ ID: 1 }]);
});

test('omits undeclared custom and unknown Edm property types instead of fabricating strings', async () => {
    const invalidMetadata = (type: string) => `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
  <edmx:DataServices>
    <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Catalog">
      <EntityType Name="User">
        <Key><PropertyRef Name="ID"/></Key>
        <Property Name="ID" Type="Edm.Int32" Nullable="false"/>
        <Property Name="Invalid" Type="${type}"/>
      </EntityType>
      <EntityContainer Name="Container"><EntitySet Name="Users" EntityType="Catalog.User"/></EntityContainer>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`;

    for (const type of ['Catalog.NotDeclared', 'Edm.NotAType']) {
        const result = await generateService(
            {
                metadata: { format: 'edmx', content: invalidMetadata(type) },
                service: { urlPath: '/catalog', odataVersion: '4.0' },
                targets: [{ name: 'Users', kind: 'entity-set' }],
                existingData: {}
            },
            { rowsPerEntity: 1 }
        );

        expect(result.resources.Users).toEqual([{ ID: 1 }]);
        expect(result.diagnostics).toContainEqual(
            expect.objectContaining({ code: 'SCHEMA_PROPERTY_OMITTED', severity: 'info', target: 'Users.Invalid' })
        );
    }
});

test('includes inherited EDMX keys and properties', async () => {
    const inheritedMetadata = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
  <edmx:DataServices>
    <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Catalog">
      <EntityType Name="Base">
        <Key><PropertyRef Name="ID"/></Key>
        <Property Name="ID" Type="Edm.Int32" Nullable="false"/>
        <Property Name="CreatedAt" Type="Edm.DateTimeOffset" Nullable="false"/>
      </EntityType>
      <EntityType Name="Product" BaseType="Catalog.Base">
        <Property Name="Name" Type="Edm.String" Nullable="false"/>
      </EntityType>
      <EntityContainer Name="Container"><EntitySet Name="Products" EntityType="Catalog.Product"/></EntityContainer>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`;

    const result = await generateService({
        metadata: { format: 'edmx', content: inheritedMetadata },
        service: { urlPath: '/catalog', odataVersion: '4.0' },
        targets: [{ name: 'Products', kind: 'entity-set' }],
        existingData: {}
    });

    expect(result.resources.Products?.[0]).toEqual(
        expect.objectContaining({ ID: 1, CreatedAt: expect.any(String), Name: expect.any(String) })
    );
});
