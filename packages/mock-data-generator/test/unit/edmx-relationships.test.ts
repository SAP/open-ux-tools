import { readFile } from 'node:fs/promises';
import { generateServiceForTesting, inspectService } from '../../src/index.js';

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
        const result = await generateServiceForTesting(
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
    const result = await generateServiceForTesting(
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
        { rowsPerEntity: 2, seed: 31 }
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

test.each([
    ['draft-composition', 'Qas', 'Qbs'],
    ['incident-management', 'Individual', 'Incidents'],
    ['workplace-admin', 'Workspace', 'Workplace']
])(
    'never infers a navigation from %s whose way back declares the reference, as the mockserver resolves it',
    async (fixture, parent, child) => {
        // Given a to-many navigation without a constraint whose partner, the child's to-one, has one
        const { parseEdmx } = await import('../../src/schema/edmx.js');
        const content = await readFile(new URL(`./fixtures/${fixture}.metadata.xml`, import.meta.url), 'utf8');
        // When the relationships are read
        const between = parseEdmx(content).relationships.filter(
            ({ fromEntitySet, toEntitySet }) =>
                (fromEntitySet === parent && toEntitySet === child) ||
                (fromEntitySet === child && toEntitySet === parent)
        );
        // Then only the declared reference links the two sets, so child keys are never drawn from parent keys
        expect(between.length).toBeGreaterThan(0);
        expect(between.filter(({ provenance }) => provenance !== 'explicit')).toEqual([]);
    }
);

test.each([
    ['fixtures/navigation-fallback', 'Zas', 'Zbs', ['Zp', 'Zr']],
    ['fixtures/navigation-fallback', 'Zas', 'Zds', ['Zp', 'Zr']],
    ['fixtures/products-review', 'SEPMRA_C_PD_Product', 'SEPMRA_C_PD_ProductImage', ['Product']],
    ['fixtures/products-review', 'SEPMRA_C_PD_Product', 'SEPMRA_C_PD_ProductSalesData', ['Product']]
])(
    'links the children of a to-many navigation from %s that declares no reference by the keys they share with the parent',
    async (fixture, parent, child, sharedKeys) => {
        // Given a to-many navigation without a constraint whose target has no navigation back that declares one
        const { parseEdmx } = await import('../../src/schema/edmx.js');
        const content = await readFile(new URL(`./${fixture}.metadata.xml`, import.meta.url), 'utf8');
        // When the relationships are read
        const { relationships } = parseEdmx(content);
        // Then each child references one parent through the keys of the child the parent also declares,
        // the keys the SAP Fiori elements mockserver matches when it lists the parent's children
        expect(
            relationships.filter(({ fromEntitySet, toEntitySet }) => fromEntitySet === child && toEntitySet === parent)
        ).toEqual([
            expect.objectContaining({
                mappings: sharedKeys.map((key) => ({ sourceProperty: key, targetProperty: key })),
                provenance: 'inferred',
                targetCardinality: 'one'
            })
        ]);
    }
);

test.each([
    ['Uas', 'Ubs'],
    ['Ucs', 'Ubs']
])(
    'lets %s, which declares some keys of its %s children but not as its own key, take their values from a child',
    async (parent, child) => {
        // Given a to-many navigation without a constraint whose parent declares part of the child key as
        // properties that are not its own key
        const { parseEdmx } = await import('../../src/schema/edmx.js');
        const content = await readFile(
            new URL('./fixtures/partial-key-navigation.metadata.xml', import.meta.url),
            'utf8'
        );
        // When the relationships are read
        const { relationships } = parseEdmx(content);
        // Then the parent references a child through them, so each parent lists a child and the child keys
        // are not drawn from the parent's values
        const between = relationships.filter(
            ({ fromEntitySet, toEntitySet }) =>
                (fromEntitySet === parent && toEntitySet === child) ||
                (fromEntitySet === child && toEntitySet === parent)
        );
        expect(between).toEqual([
            expect.objectContaining({
                fromEntitySet: parent,
                toEntitySet: child,
                mappings: ['Um', 'Un'].map((key) => ({ sourceProperty: key, targetProperty: key })),
                provenance: 'inferred',
                targetCardinality: 'many'
            })
        ]);
    }
);

test('reads an association whose principal properties are not the principal key as the principal referencing the dependent key', async () => {
    // Given an OData V2 navigation from the principal of a constraint that names a principal property other than
    // its key, and the dependent's complete key
    const { parseEdmx } = await import('../../src/schema/edmx.js');
    const content = await readFile(new URL('./fixtures/principal-non-key.metadata.xml', import.meta.url), 'utf8');
    // When the relationships are read
    const between = parseEdmx(content).relationships.filter(
        ({ fromEntitySet, toEntitySet }) =>
            (fromEntitySet === 'Tas' && toEntitySet === 'Tbs') || (fromEntitySet === 'Tbs' && toEntitySet === 'Tas')
    );
    // Then the principal references one dependent row by its key, so the dependent key keeps its own values
    expect(between).toEqual([
        expect.objectContaining({
            fromEntitySet: 'Tas',
            toEntitySet: 'Tbs',
            mappings: [{ sourceProperty: 'Tu', targetProperty: 'Tu' }],
            provenance: 'explicit'
        })
    ]);
});

test.each([
    ['fixtures/association-fallback', 'Yas', 'Ycs', [['Yq', 'Yk']]],
    ['fixtures/products-review', 'SEPMRA_C_PD_Review', 'SEPMRA_C_PD_ReviewPost', [['Product', 'Product']]],
    ['travel-v2', 'SAP__MyDocumentDescriptions', 'SAP__TableColumnsSet', [['Id', 'Id']]],
    ['fixtures/store-overview', 'BusinessPartnerSet', 'ProductSet', [['SupplierID', 'BusinessPartnerID']]]
])(
    'reads the association from %s whose constraint names the parent as principal as the reference of its children',
    async (fixture, parent, child, mappings) => {
        // Given an OData V2 navigation from the principal of its association's referential constraint
        const { parseEdmx } = await import('../../src/schema/edmx.js');
        const content = await readFile(new URL(`./${fixture}.metadata.xml`, import.meta.url), 'utf8');
        // When the relationships are read
        const { relationships } = parseEdmx(content);
        // Then the dependent's properties reference the principal's, as declared
        expect(
            relationships.filter(({ fromEntitySet, toEntitySet }) => fromEntitySet === child && toEntitySet === parent)
        ).toEqual([
            expect.objectContaining({
                mappings: mappings.map(([sourceProperty, targetProperty]) => ({ sourceProperty, targetProperty })),
                provenance: 'explicit'
            })
        ]);
    }
);

test.each([
    ['fixtures/association-fallback', 'Ybs', 'Yas', 'Yk'],
    ['fixtures/products-review', 'SEPMRA_C_PD_ProductText', 'SEPMRA_C_PD_Product', 'Product'],
    ['travel-v2', 'Booking', 'BookingStatus', 'BookingStatus']
])(
    'infers the reference of an OData V2 navigation from %s whose association declares no constraint',
    async (fixture, source, target, key) => {
        // Given a to-one navigation whose association has no referential constraint
        const { parseEdmx } = await import('../../src/schema/edmx.js');
        const content = await readFile(new URL(`./${fixture}.metadata.xml`, import.meta.url), 'utf8');
        // When the relationships are read
        const { relationships } = parseEdmx(content);
        // Then the source references the target through the target's key it declares, as an OData V4
        // navigation without a constraint does
        expect(
            relationships.filter(({ fromEntitySet, toEntitySet }) => fromEntitySet === source && toEntitySet === target)
        ).toEqual([
            expect.objectContaining({
                mappings: [{ sourceProperty: key, targetProperty: key }],
                provenance: 'inferred'
            })
        ]);
    }
);

test.each([
    ['fixtures/reference-precedence', 'Wos', 'Wns', false],
    ['fixtures/reference-precedence', 'Wus', 'Wns', true]
])(
    'infers the reference from %s %s to %s only where a declared reference through the same properties agrees with it: %s',
    async (fixture, source, target, inferred) => {
        // Given a navigation without a constraint whose properties a declared reference to another set also maps
        const { parseEdmx } = await import('../../src/schema/edmx.js');
        const content = await readFile(new URL(`./${fixture}.metadata.xml`, import.meta.url), 'utf8');
        // When the relationships are read
        const { relationships } = parseEdmx(content);
        // Then the inferred reference is kept only when the declared parent itself references the inferred
        // target through those properties; otherwise no row could match a parent of both
        expect(
            relationships.some(
                ({ fromEntitySet, toEntitySet, provenance }) =>
                    fromEntitySet === source && toEntitySet === target && provenance === 'inferred'
            )
        ).toBe(inferred);
    }
);

test('recovers explicit and uniquely inferred composite mappings throughout the synthetic finance schema', async () => {
    const metadata = await readFile(new URL('./synthetic-finance.metadata.xml', import.meta.url), 'utf8');

    const inspection = await inspectService(
        {
            metadata: { format: 'edmx', content: metadata },
            service: { urlPath: '/synthetic-finance', odataVersion: '4.0' },
            targets: [{ name: 'Contacts', kind: 'entity-set' }],
            existingData: {}
        },
        { rowsPerEntity: 1, seed: 31 }
    );
    const mappingCount = (provenance: 'explicit' | 'inferred') =>
        inspection.relationships
            .filter((relationship) => relationship.provenance === provenance)
            .reduce((total, relationship) => total + relationship.mappings.length, 0);

    expect(inspection.sourceOwnership).toHaveLength(1);
    expect(
        inspection.fieldDecisions.map((decision) => decision.resource).filter((name) => name === 'Banks')
    ).not.toHaveLength(0);
    expect(mappingCount('explicit')).toBe(6);
    expect(mappingCount('inferred')).toBe(6);
    const bankMappings = [
        { sourceProperty: 'BankCountry', targetProperty: 'BankCountry' },
        { sourceProperty: 'BankID', targetProperty: 'BankID' }
    ];
    expect(inspection.relationships).toEqual(
        expect.arrayContaining([
            expect.objectContaining({
                name: 'Address',
                fromResource: 'Banks',
                toResource: 'BankAddresses',
                mappings: bankMappings,
                provenance: 'inferred',
                confidence: 0.8
            }),
            expect.objectContaining({
                name: 'StatementPolicy',
                fromResource: 'Banks',
                toResource: 'StatementPolicies',
                mappings: bankMappings,
                provenance: 'inferred',
                confidence: 0.8
            }),
            expect.objectContaining({
                name: 'PaymentScheme',
                fromResource: 'CompanyLinks',
                toResource: 'PaymentSchemes',
                mappings: [
                    { sourceProperty: 'SchemeCountry', targetProperty: 'SchemeCountry' },
                    { sourceProperty: 'SchemeID', targetProperty: 'SchemeID' }
                ],
                provenance: 'inferred',
                confidence: 0.8
            }),
            expect.objectContaining({
                name: 'ParentBank',
                fromResource: 'Branches',
                toResource: 'Banks',
                mappings: [
                    { sourceProperty: 'ParentCountry', targetProperty: 'BankCountry' },
                    { sourceProperty: 'ParentBankID', targetProperty: 'BankID' }
                ],
                provenance: 'explicit'
            }),
            expect.objectContaining({
                name: 'Bank',
                fromResource: 'PartnerLinks',
                toResource: 'Banks',
                mappings: bankMappings,
                provenance: 'explicit'
            }),
            expect.objectContaining({
                name: 'Bank',
                fromResource: 'CompanyLinks',
                toResource: 'Banks',
                mappings: bankMappings,
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

    const result = await generateServiceForTesting({
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

    const result = await generateServiceForTesting(
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
        const result = await generateServiceForTesting(
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

    const result = await generateServiceForTesting({
        metadata: { format: 'edmx', content: inheritedMetadata },
        service: { urlPath: '/catalog', odataVersion: '4.0' },
        targets: [{ name: 'Products', kind: 'entity-set' }],
        existingData: {}
    });

    expect(result.resources.Products?.[0]).toEqual(
        expect.objectContaining({ ID: 1, CreatedAt: expect.any(String), Name: expect.any(String) })
    );
});
