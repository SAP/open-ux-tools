import { generateService } from '../../src/index.js';

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

test('rejects complex and unknown property types instead of fabricating strings', async () => {
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

    await expect(
        generateService({
            metadata: { format: 'edmx', content: complexMetadata },
            service: { urlPath: '/catalog', odataVersion: '4.0' },
            targets: [{ name: 'Users', kind: 'entity-set' }],
            existingData: {}
        })
    ).rejects.toThrow(/unsupported property type Catalog\.Address/i);
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
