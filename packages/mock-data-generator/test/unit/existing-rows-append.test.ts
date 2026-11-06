import { generateServiceForTesting } from '../../src/index.js';
import { MAX_ROWS_PER_ENTITY } from '../../src/limits.js';
import type { MockDataRow } from '../../src/types.js';

/**
 * A service with meaningless names: Pa rows carry a key, a semantic key and a field whose value list is Pv.
 */
const METADATA = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
  <edmx:DataServices>
    <Schema Namespace="Ps" xmlns="http://docs.oasis-open.org/odata/ns/edm">
      <EntityContainer Name="EntityContainer">
        <EntitySet Name="Pas" EntityType="Ps.Pa"/>
        <EntitySet Name="Pvs" EntityType="Ps.Pv"/>
      </EntityContainer>
      <EntityType Name="Pa">
        <Key><PropertyRef Name="Pk"/></Key>
        <Property Name="Pk" Type="Edm.Guid" Nullable="false"/>
        <Property Name="Pc" Type="Edm.String" MaxLength="10"/>
        <Property Name="Pn" Type="Edm.String" MaxLength="4"/>
        <Property Name="Pq" Type="Edm.Int32"/>
      </EntityType>
      <EntityType Name="Pv">
        <Key><PropertyRef Name="Pn"/></Key>
        <Property Name="Pn" Type="Edm.String" Nullable="false" MaxLength="4"/>
      </EntityType>
      <Annotations Target="Ps.Pa">
        <Annotation Term="Common.SemanticKey"><Collection><PropertyPath>Pc</PropertyPath></Collection></Annotation>
      </Annotations>
      <Annotations Target="Ps.Pa/Pn">
        <Annotation Term="Common.ValueList">
          <Record>
            <PropertyValue Property="CollectionPath" String="Pvs"/>
            <PropertyValue Property="Parameters">
              <Collection>
                <Record Type="Common.ValueListParameterInOut">
                  <PropertyValue Property="LocalDataProperty" PropertyPath="Pn"/>
                  <PropertyValue Property="ValueListProperty" String="Pn"/>
                </Record>
              </Collection>
            </PropertyValue>
          </Record>
        </Annotation>
      </Annotations>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`;

/**
 * Generates both entity sets next to supplied rows.
 *
 * @param existingRows - Rows already in the mock data folder, by entity set.
 * @param seed - The generation seed.
 * @returns The rows and diagnostics of the run.
 */
async function generate(
    existingRows: Readonly<Record<string, ReadonlyArray<MockDataRow>>>,
    seed = 1,
    rowsPerEntity: number | Readonly<Record<string, number>> = 5
) {
    return generateServiceForTesting(
        {
            metadata: { format: 'edmx', content: METADATA },
            service: { urlPath: '/append', odataVersion: '4.0' },
            targets: [
                { name: 'Pas', kind: 'entity-set' },
                { name: 'Pvs', kind: 'entity-set' }
            ],
            existingData: Object.fromEntries(
                Object.entries(existingRows).map(([name, rows]) => [
                    name,
                    { contributor: { present: false }, initialRows: { source: 'json', present: true, rows } } as const
                ])
            )
        },
        { seed, rowsPerEntity }
    );
}

const supplied = (count: number): MockDataRow[] =>
    Array.from({ length: count }, (_, index) => ({
        Pk: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
        Pc: `C${index}`
    }));

describe('rows generated next to existing rows', () => {
    it('returns every existing row as supplied and appends the requested rows after them', async () => {
        // Given three supplied rows that leave fields out
        const existing = supplied(3);
        // When rows are generated
        const { resources } = await generate({ Pas: existing });
        // Then the supplied rows come first, unchanged, followed by five new rows
        expect(resources.Pas.slice(0, 3)).toEqual(existing);
        expect(resources.Pas).toHaveLength(8);
        expect(new Set(resources.Pas.map(({ Pk }) => Pk)).size).toBe(8);
    });

    it.each([[['AB', 'CD']], [['AB', 'CD', 'EF', 'GH', 'IJ', 'KL']]])(
        'appends no row to a value help whose rows are supplied, and says why (%j)',
        async (codes) => {
            // Given supplied value-help rows, fewer or more than the requested rows
            const values = codes.map((Pn) => ({ Pn }));
            // When rows are generated
            const { resources, diagnostics } = await generate({ Pvs: values });
            // Then the value help holds exactly its supplied rows, and the new rows use them
            expect(resources.Pvs).toEqual(values);
            expect(resources.Pas.every(({ Pn }) => codes.includes(String(Pn)))).toBe(true);
            // And the requested rows it did not receive are reported
            expect(diagnostics).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ code: 'ROW_COUNT_REDUCED_AUTHORED_DOMAIN', target: 'Pvs' })
                ])
            );
        }
    );

    it('appends rows to a value help whose rows are supplied when a request asks rows of it by name', async () => {
        // Given supplied value-help rows and supplied rows that use them
        const values = [{ Pn: 'AB' }, { Pn: 'CD' }];
        // When one row of the value help, and none of the other set, is asked by name
        const { resources, diagnostics } = await generate({ Pvs: values, Pas: supplied(2) }, 1, { Pvs: 1, Pas: 0 });
        // Then the value help keeps its supplied rows and gains exactly one row with a new key
        expect(resources.Pvs.slice(0, 2)).toEqual(values);
        expect(resources.Pvs).toHaveLength(3);
        expect(values.map(({ Pn }) => Pn)).not.toContain(resources.Pvs[2].Pn);
        // And the other set is unchanged, and no reduction is reported for the value help
        expect(resources.Pas).toEqual(supplied(2));
        expect(diagnostics).not.toEqual(
            expect.arrayContaining([
                expect.objectContaining({ code: 'ROW_COUNT_REDUCED_AUTHORED_DOMAIN', target: 'Pvs' })
            ])
        );
    });

    it.each([[1], [7]])('repeats no semantic key of a supplied row in a new row (seed %d)', async (seed) => {
        // Given supplied rows that hold the semantic keys an earlier run generated, under other keys
        const earlier = (await generate({}, seed)).resources.Pas;
        const existing = earlier.map((row, index) => ({ ...row, Pk: supplied(earlier.length)[index].Pk }));
        // When rows are generated next to them
        const { resources } = await generate({ Pas: existing }, seed);
        // Then no two rows share a semantic key
        const codes = resources.Pas.map(({ Pc }) => Pc);
        expect(resources.Pas).toHaveLength(existing.length + 5);
        expect(new Set(codes).size).toBe(codes.length);
    });

    it('appends only up to the row limit and says so', async () => {
        // Given a set two rows short of the row limit
        const existing = supplied(MAX_ROWS_PER_ENTITY - 2);
        // When rows are generated
        const { resources, diagnostics } = await generate({ Pas: existing });
        // Then two rows are appended and the reduction is reported
        expect(resources.Pas).toHaveLength(MAX_ROWS_PER_ENTITY);
        expect(diagnostics).toEqual(
            expect.arrayContaining([expect.objectContaining({ code: 'ROW_COUNT_REDUCED_ROW_LIMIT', target: 'Pas' })])
        );
    });
});
