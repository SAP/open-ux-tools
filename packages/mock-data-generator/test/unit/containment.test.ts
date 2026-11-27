import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { generateServiceForTesting, validateGeneratedResult } from '../../src/index.js';
import { MAX_CONTAINED_ENTITIES } from '../../src/limits.js';
import { parseEdmx } from '../../src/schema/edmx.js';
import type { MockDataRow, MockDataServiceRequest } from '../../src/types.js';

test('gives independent contained Boolean keys a separate capacity in each parent', async () => {
    const metadata = `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
<edmx:DataServices><Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Demo">
<EntityType Name="Parent"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<NavigationProperty Name="Children" Type="Collection(Demo.Child)" ContainsTarget="true"/>
</EntityType><EntityType Name="Child"><Key><PropertyRef Name="Flag"/></Key>
<Property Name="Flag" Type="Edm.Boolean" Nullable="false"/>
</EntityType><EntityContainer Name="Container"><EntitySet Name="Parents" EntityType="Demo.Parent"/></EntityContainer>
</Schema></edmx:DataServices></edmx:Edmx>`;
    const result = await generateServiceForTesting(
        {
            metadata: { format: 'edmx', content: metadata },
            service: { urlPath: '/containers', odataVersion: '4.0' },
            targets: [{ name: 'Parents', kind: 'entity-set' }],
            existingData: {}
        },
        { mode: 'deterministic', rowsPerEntity: 5 }
    );
    expect(result.resources.Parents.map((row) => (Array.isArray(row.Children) ? row.Children.length : 0))).toEqual([
        1, 1, 1, 1, 1
    ]);
    expect(result.tiers?.slots).toBe(10);
});

/**
 * A service with meaningless names. Only Ya has an entity set and is draft-enabled through its standard keys.
 * Each Ya contains a list of Yb, which reference their container through a declared constraint and contain
 * further Yb, one Yc without a key, and a list of Ye, which share no key with Ya but the draft flag.
 */
const METADATA = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
  <edmx:DataServices>
    <Schema Namespace="Ys" xmlns="http://docs.oasis-open.org/odata/ns/edm">
      <EntityContainer Name="EntityContainer">
        <EntitySet Name="Yas" EntityType="Ys.Ya"/>
      </EntityContainer>
      <EntityType Name="Ya">
        <Key><PropertyRef Name="Yk"/><PropertyRef Name="IsActiveEntity"/></Key>
        <Property Name="Yk" Type="Edm.String" Nullable="false" MaxLength="10"/>
        <Property Name="IsActiveEntity" Type="Edm.Boolean" Nullable="false"/>
        <Property Name="HasActiveEntity" Type="Edm.Boolean" Nullable="false"/>
        <Property Name="HasDraftEntity" Type="Edm.Boolean" Nullable="false"/>
        <NavigationProperty Name="Ybn" Type="Collection(Ys.Yb)" ContainsTarget="true" Partner="Yup"/>
        <NavigationProperty Name="Ycn" Type="Ys.Yc" ContainsTarget="true"/>
        <NavigationProperty Name="Yen" Type="Collection(Ys.Ye)" ContainsTarget="true"/>
      </EntityType>
      <EntityType Name="Ye">
        <Key><PropertyRef Name="Yu"/><PropertyRef Name="IsActiveEntity"/></Key>
        <Property Name="Yu" Type="Edm.Guid" Nullable="false"/>
        <Property Name="IsActiveEntity" Type="Edm.Boolean" Nullable="false"/>
        <Property Name="HasActiveEntity" Type="Edm.Boolean" Nullable="false"/>
        <Property Name="HasDraftEntity" Type="Edm.Boolean" Nullable="false"/>
      </EntityType>
      <EntityType Name="Yb">
        <Key><PropertyRef Name="Yk"/><PropertyRef Name="Yj"/><PropertyRef Name="IsActiveEntity"/></Key>
        <Property Name="Yk" Type="Edm.String" Nullable="false" MaxLength="10"/>
        <Property Name="Yj" Type="Edm.String" Nullable="false" MaxLength="6"/>
        <Property Name="IsActiveEntity" Type="Edm.Boolean" Nullable="false"/>
        <Property Name="HasActiveEntity" Type="Edm.Boolean" Nullable="false"/>
        <Property Name="HasDraftEntity" Type="Edm.Boolean" Nullable="false"/>
        <Property Name="Yq" Type="Edm.Int32"/>
        <NavigationProperty Name="Yup" Type="Ys.Ya" Nullable="false" Partner="Ybn">
          <ReferentialConstraint Property="Yk" ReferencedProperty="Yk"/>
          <ReferentialConstraint Property="IsActiveEntity" ReferencedProperty="IsActiveEntity"/>
        </NavigationProperty>
        <NavigationProperty Name="Ybs" Type="Collection(Ys.Yb)" ContainsTarget="true"/>
      </EntityType>
      <EntityType Name="Yc">
        <Property Name="Yt" Type="Edm.String" MaxLength="20"/>
      </EntityType>
      <Annotations Target="Ys.EntityContainer/Yas">
        <Annotation Term="Common.DraftRoot"><Record><PropertyValue Property="EditAction" String="Ys.edit"/></Record></Annotation>
      </Annotations>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`;

/**
 * Builds a request for the Yas entity set.
 *
 * @param existingRows - Rows already in the mock data folder.
 * @returns The request.
 */
function request(existingRows?: ReadonlyArray<MockDataRow>): MockDataServiceRequest {
    return {
        metadata: { format: 'edmx', content: METADATA },
        service: { urlPath: '/contained', odataVersion: '4.0' },
        targets: [{ name: 'Yas', kind: 'entity-set' }],
        existingData: existingRows
            ? {
                  Yas: {
                      contributor: { present: false },
                      initialRows: { source: 'json', present: true, rows: existingRows }
                  }
              }
            : {}
    };
}

/**
 * The rows a container row holds under a navigation.
 *
 * @param row - The container row.
 * @param navigation - The containment navigation.
 * @returns The contained rows.
 */
function held(row: MockDataRow, navigation: string): MockDataRow[] {
    const value = row[navigation];
    return Array.isArray(value)
        ? value.filter(
              (entry): entry is MockDataRow => typeof entry === 'object' && entry !== null && !Array.isArray(entry)
          )
        : [];
}

describe('contained entities', () => {
    it('reads each contained type without an entity set by its containment path, and stops at recursion', () => {
        // Given a type contained by a set, which contains its own type again
        // When the metadata is parsed
        const graph = parseEdmx(METADATA);
        // Then each contained type is an entity named by its path, and the recursive containment is not
        expect(graph.entities.map(({ entitySetName, containedBy }) => [entitySetName, containedBy])).toEqual([
            ['Yas', undefined],
            ['Yas/Ybn', { entitySetName: 'Yas', navigation: 'Ybn', isCollection: true }],
            ['Yas/Ycn', { entitySetName: 'Yas', navigation: 'Ycn', isCollection: false }],
            ['Yas/Yen', { entitySetName: 'Yas', navigation: 'Yen', isCollection: true }]
        ]);
        // And no key mapping links a container to what it contains
        expect(graph.relationships.map(({ fromEntitySet, toEntitySet }) => [fromEntitySet, toEntitySet])).toEqual([
            ['Yas/Ybn', 'Yas']
        ]);
    });

    it('publishes contained rows inside their container, referencing it, with keys unique per container', async () => {
        // Given the request for the container set
        // When rows are generated
        const { resources } = await generateServiceForTesting(request(), { seed: 3, rowsPerEntity: 10 });
        // Then only the container set is published, and every container holds contained rows that reference it
        expect(Object.keys(resources)).toEqual(['Yas']);
        for (const container of resources.Yas) {
            const children = held(container, 'Ybn');
            expect(children.length).toBeGreaterThan(0);
            expect(children.every(({ Yk, IsActiveEntity }) => Yk === container.Yk && IsActiveEntity === true)).toBe(
                true
            );
            expect(new Set(children.map(({ Yj }) => Yj)).size).toBe(children.length);
            // And one row of the type without a key
            expect(container.Ycn).toEqual([{ Yt: expect.any(String) }]);
            // And rows that share only the draft flag with it, spread over all containers
            expect(held(container, 'Yen')).toEqual([expect.objectContaining({ IsActiveEntity: true })]);
        }
    });

    it('adds contained rows to new containers only, leaving supplied containers as supplied', async () => {
        // Given a supplied container without contained rows
        const supplied = { Yk: 'S1', IsActiveEntity: true, HasActiveEntity: false, HasDraftEntity: false };
        // When rows are generated next to it
        const { resources } = await generateServiceForTesting(request([supplied]), { seed: 3, rowsPerEntity: 4 });
        // Then the supplied container is published as supplied, and each new container holds contained rows
        expect(resources.Yas[0]).toEqual(supplied);
        expect(resources.Yas.slice(1).every((row) => held(row, 'Ybn').length > 0)).toBe(true);
    });

    it('rejects a result whose generated container holds something other than rows', async () => {
        // Given a generated result whose first container holds a value under its containment navigation
        const input = request();
        const result = await generateServiceForTesting(input, { seed: 3, rowsPerEntity: 3 });
        const tampered = {
            ...result,
            resources: { Yas: [{ ...result.resources.Yas[0], Ybn: 'not rows' }, ...result.resources.Yas.slice(1)] }
        };
        // When the result is validated
        // Then the shape is rejected
        expect(() => validateGeneratedResult(input, tampered)).toThrow(/invalid contained rows under Ybn/u);
    });
});

describe('keys of contained rows', () => {
    const containedChildren: MockDataServiceRequest = {
        metadata: {
            format: 'edmx',
            content: readFileSync(
                fileURLToPath(new URL('./fixtures/contained-children.metadata.xml', import.meta.url)),
                'utf8'
            )
        },
        service: { urlPath: '/contained-children', odataVersion: '4.0' },
        targets: [{ name: 'Zas', kind: 'entity-set' }],
        existingData: {}
    };

    /**
     * Generate the containers, then give every one of them, and the rows they contain, the first one's value of the
     * property their contained row copies as its key.
     *
     * @returns the result
     */
    async function containersSharingTheContainedKey(): Promise<{
        result: Awaited<ReturnType<typeof generateServiceForTesting>>;
    }> {
        const result = await generateServiceForTesting(containedChildren, { seed: 1, rowsPerEntity: 4 });
        const shared = result.resources.Zas[0].Zi;
        const Zas = result.resources.Zas.map((row) => ({
            ...row,
            Zi: shared,
            Zcn: held(row, 'Zcn').map((child) => ({
                ...child,
                Zi: shared,
                Zgn: held(child, 'Zgn').map((grandchild) => ({ ...grandchild, Zi: shared }))
            }))
        }));
        return { result: { ...result, resources: { ...result.resources, Zas } } };
    }

    it('accepts the same key in different containers', async () => {
        // Given containers whose to-one contained rows copy the same key from them
        const { result } = await containersSharingTheContainedKey();
        // When the result is validated
        // Then it is accepted, since a contained key only identifies a row within its container
        expect(() => validateGeneratedResult(containedChildren, result)).not.toThrow();
    });

    it('rejects the same key twice in one container', async () => {
        // Given a container holding two contained rows with one key
        const { result } = await containersSharingTheContainedKey();
        const [first, ...rest] = result.resources.Zas;
        const children = held(first, 'Zbn');
        const tampered = {
            ...result,
            resources: { ...result.resources, Zas: [{ ...first, Zbn: [children[0], children[0]] }, ...rest] }
        };
        // When the result is validated
        // Then the duplicate key is rejected
        expect(() => validateGeneratedResult(containedChildren, tampered)).toThrow(/duplicate key/u);
    });
});

/**
 * A service of types without entity sets that each contain every other, under one root entity set: every order of the
 * types is a containment path, so the paths grow factorially with the number of types.
 *
 * @param types the number of mutually containing types
 * @returns the EDMX document
 */
function mutualContainment(types: number): string {
    const navigations = (self: number): string =>
        Array.from({ length: types }, (_, index) =>
            index === self
                ? ''
                : `<NavigationProperty Name="c${index}" Type="Collection(n.T${index})" ContainsTarget="true"/>`
        ).join('');
    const entityTypes = Array.from(
        { length: types },
        (_, index) =>
            `<EntityType Name="T${index}"><Key><PropertyRef Name="ID"/></Key><Property Name="ID" Type="Edm.Int32" Nullable="false"/>${navigations(index)}</EntityType>`
    ).join('');
    return `<?xml version="1.0"?><edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx"><edmx:DataServices><Schema Namespace="n" xmlns="http://docs.oasis-open.org/odata/ns/edm">${entityTypes}<EntityType Name="Root"><Key><PropertyRef Name="ID"/></Key><Property Name="ID" Type="Edm.Int32" Nullable="false"/>${navigations(-1)}</EntityType><EntityContainer Name="C"><EntitySet Name="Roots" EntityType="n.Root"/></EntityContainer></Schema></edmx:DataServices></edmx:Edmx>`;
}

describe('containment that grows faster than a service can hold', () => {
    it('reads the shallowest containment paths up to the limit and counts the deeper ones', () => {
        // Given nine mutually containing types, whose containment paths number almost a million
        const content = mutualContainment(9);

        // When the metadata is parsed
        const graph = parseEdmx(content);

        // Then it reads at most the limit of contained entities, every first-level one among them
        const contained = graph.entities.filter(({ containedBy }) => containedBy !== undefined);
        expect(contained.length).toBeLessThanOrEqual(MAX_CONTAINED_ENTITIES);
        expect(contained.filter(({ containedBy }) => containedBy?.entitySetName === 'Roots')).toHaveLength(9);
        // And the paths beyond the limit are counted
        expect(graph.omittedContainmentPaths).toBeGreaterThan(0);
        expect(graph.skippedEntitySets).toBeUndefined();
    });

    it('generates the root entity set of such a service', async () => {
        // Given the same service
        const request: MockDataServiceRequest = {
            metadata: { format: 'edmx', content: mutualContainment(9) },
            service: { urlPath: '/roots', odataVersion: '4.0' },
            targets: [{ name: 'Roots', kind: 'entity-set' }],
            existingData: {}
        };

        // When ten rows of its root entity set are generated
        const result = await generateServiceForTesting(request, { mode: 'deterministic', seed: 1, rowsPerEntity: 10 });

        // Then the root has its rows, and one warning reports the paths left out
        expect(result.resources.Roots).toHaveLength(10);
        const skipped = result.diagnostics.filter(({ code }) => code === 'SCHEMA_ENTITY_SET_SKIPPED');
        expect(skipped.map(({ severity }) => severity)).toEqual(['warning']);
        expect(skipped[0]?.message).toContain(`at most ${MAX_CONTAINED_ENTITIES}`);
    });
});
