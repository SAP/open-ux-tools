import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateServiceForTesting } from '../../src/index.js';
import { parseEdmx } from '../../src/schema/edmx.js';
import type { SchemaEntity, SchemaGraph, SchemaProperty } from '../../src/schema/graph.js';
import type { MockDataRow, MockDataServiceRequest } from '../../src/types.js';

const FIXTURES = fileURLToPath(new URL('./fixtures', import.meta.url));
const UNIT = fileURLToPath(new URL('.', import.meta.url));

/** Services of different domains and protocol versions, and one whose names mean nothing. */
const SERVICES = [
    ['travel-v2', join(UNIT, 'travel-v2.metadata.xml'), '2.0'],
    ['incident-management', join(FIXTURES, 'incident-management.metadata.xml'), '4.0'],
    ['navigation-fallback', join(FIXTURES, 'navigation-fallback.metadata.xml'), '4.0']
] as const;

const SUPPLIED_ROWS = 3;

/**
 * A value as the standard mockserver generator or a quick hand-written test file writes it: the
 * property name with the row number, cut to the declared length, and the simplest value of other types.
 *
 * @param property - The property.
 * @param index - The row number, from 1.
 * @returns The value.
 */
function standardValue(property: SchemaProperty, index: number): MockDataRow[string] {
    switch (property.primitiveType) {
        case 'string': {
            const suffix = String(index);
            const length = property.maxLength ?? 40;
            return `${property.name.slice(0, Math.max(1, length - suffix.length))}${suffix}`.slice(0, length);
        }
        case 'int':
        case 'decimal':
            return index;
        case 'bool':
            return false;
        case 'guid':
            return `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
        case 'date':
            return `2020-01-0${index}`;
        case 'datetime':
        case 'datetimeoffset':
            return `2020-01-0${index}T00:00:00Z`;
        case 'time':
            return `0${index}:00:00`;
        default:
            return null;
    }
}

/**
 * The entity sets another set's value list reads: their supplied rows are the values new rows choose from, so
 * they are left out of this test.
 *
 * @param graph - The service schema.
 * @returns The names of the value-list sets.
 */
function domainSets(graph: SchemaGraph): Set<string> {
    return new Set(
        graph.entities.flatMap(({ properties }) =>
            properties.flatMap(({ links }) => (links?.valueListCollection ? [links.valueListCollection] : []))
        )
    );
}

/**
 * Whether a value is a placeholder made of the start of its property's name and a number.
 *
 * @param property - The property.
 * @param value - The value.
 * @returns True for a placeholder.
 */
function isPlaceholder(property: SchemaProperty, value: MockDataRow[string]): boolean {
    const match = typeof value === 'string' ? /^([A-Za-z]+)_?\d+$/u.exec(value) : null;
    return match !== null && property.name.toLowerCase().startsWith(match[1].toLowerCase());
}

/**
 * Whether a cell is empty.
 *
 * @param _property - The property.
 * @param value - The value.
 * @returns True for null, a missing value or the empty string.
 */
function isEmpty(_property: SchemaProperty, value: MockDataRow[string]): boolean {
    return value === null || value === undefined || value === '';
}

/**
 * Counts the cells a predicate holds for among the rows after the first `skip` rows of every entity.
 *
 * @param entities - The entities.
 * @param resources - The rows by entity set.
 * @param skip - The supplied rows of each set, by name.
 * @param holds - The predicate.
 * @returns The cell count.
 */
function cells(
    entities: ReadonlyArray<SchemaEntity>,
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>,
    skip: Readonly<Record<string, number>>,
    holds: (property: SchemaProperty, value: MockDataRow[string]) => boolean
): number {
    return entities.reduce(
        (count, { entitySetName, properties }) =>
            count +
            (resources[entitySetName] ?? [])
                .slice(skip[entitySetName] ?? 0)
                .reduce(
                    (sum, row) => sum + properties.filter((property) => holds(property, row[property.name])).length,
                    0
                ),
        0
    );
}

describe('rows generated next to existing rows', () => {
    it.each(SERVICES)(
        'are planned and filled for %s as if the folder were empty, whatever the existing rows hold',
        async (_name, path, odataVersion) => {
            // Given rows in the standard mockserver form for every set that is no other set's domain
            const content = readFileSync(path, 'utf8');
            const graph = parseEdmx(content);
            const domains = domainSets(graph);
            const targets = graph.entities.filter(({ containedBy }) => containedBy === undefined);
            const supplied = targets.filter(({ entitySetName }) => !domains.has(entitySetName));
            const request = (existingData: MockDataServiceRequest['existingData']): MockDataServiceRequest => ({
                metadata: { format: 'edmx', content },
                service: { urlPath: '/independence', odataVersion },
                targets: targets.map(({ entitySetName }) => ({ name: entitySetName, kind: 'entity-set' as const })),
                existingData
            });
            const existingData = Object.fromEntries(
                supplied.map(({ entitySetName, properties }) => [
                    entitySetName,
                    {
                        contributor: { present: false },
                        initialRows: {
                            source: 'json',
                            present: true,
                            rows: Array.from({ length: SUPPLIED_ROWS }, (_, index) =>
                                Object.fromEntries(
                                    properties.map((property) => [property.name, standardValue(property, index + 1)])
                                )
                            )
                        }
                    } as const
                ])
            );
            // When rows are generated into an empty folder and next to the existing rows
            const empty = await generateServiceForTesting(request({}), { seed: 1, rowsPerEntity: 10 });
            const next = await generateServiceForTesting(request(existingData), { seed: 1, rowsPerEntity: 10 });
            // Then every field is planned with the same role
            expect(next.semanticRoles).toEqual(empty.semanticRoles);
            // And the new rows hold no more placeholders and no more empty cells than the rows of the empty folder
            const skip = Object.fromEntries(supplied.map(({ entitySetName }) => [entitySetName, SUPPLIED_ROWS]));
            for (const holds of [isPlaceholder, isEmpty]) {
                expect(cells(targets, next.resources, skip, holds)).toBeLessThanOrEqual(
                    cells(targets, empty.resources, {}, holds)
                );
            }
        },
        60_000
    );

    it('links new children to new parents, so no new row copies a field of an existing parent', async () => {
        // Given a service whose names mean nothing, where a child repeats a code and its text from its parent,
        // and existing parent rows whose keys sort before any new key and whose texts are placeholders
        const content = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx"><edmx:DataServices>
<Schema Namespace="Qs" xmlns="http://docs.oasis-open.org/odata/ns/edm">
<EntityContainer Name="C"><EntitySet Name="Qas" EntityType="Qs.Qa"><NavigationPropertyBinding Path="_Qb" Target="Qbs"/></EntitySet>
<EntitySet Name="Qbs" EntityType="Qs.Qb"><NavigationPropertyBinding Path="_Qa" Target="Qas"/></EntitySet></EntityContainer>
<EntityType Name="Qa"><Key><PropertyRef Name="Qk"/></Key><Property Name="Qk" Type="Edm.String" MaxLength="10" Nullable="false"/>
<Property Name="Qc" Type="Edm.String" MaxLength="3"/><Property Name="QcName" Type="Edm.String" MaxLength="50"/>
<NavigationProperty Name="_Qb" Type="Collection(Qs.Qb)" Partner="_Qa"/></EntityType>
<EntityType Name="Qb"><Key><PropertyRef Name="Qj"/></Key><Property Name="Qj" Type="Edm.Int32" Nullable="false"/>
<Property Name="Qk" Type="Edm.String" MaxLength="10"/><Property Name="Qc" Type="Edm.String" MaxLength="3"/><Property Name="QcName" Type="Edm.String" MaxLength="50"/>
<NavigationProperty Name="_Qa" Type="Qs.Qa" Partner="_Qb"><ReferentialConstraint Property="Qk" ReferencedProperty="Qk"/></NavigationProperty></EntityType>
<Annotations Target="Qs.Qa/Qc"><Annotation Term="Common.Text" Path="QcName"/></Annotations>
<Annotations Target="Qs.Qb/Qc"><Annotation Term="Common.Text" Path="QcName"/></Annotations>
</Schema></edmx:DataServices></edmx:Edmx>`;
        const existing = [1, 2, 3].map((index) => ({ Qk: `0${index}`, Qc: `Q${index}`, QcName: `QcName${index}` }));
        // When parents and children are generated next to them
        const result = await generateServiceForTesting(
            {
                metadata: { format: 'edmx', content },
                service: { urlPath: '/independence', odataVersion: '4.0' },
                targets: [
                    { name: 'Qas', kind: 'entity-set' },
                    { name: 'Qbs', kind: 'entity-set' }
                ],
                existingData: {
                    Qas: {
                        contributor: { present: false },
                        initialRows: { source: 'json', present: true, rows: existing }
                    }
                }
            },
            { seed: 1, rowsPerEntity: 6 }
        );
        // Then every new child references a new parent
        const newParents = new Set(result.resources.Qas.slice(existing.length).map(({ Qk }) => Qk));
        expect(result.resources.Qbs.map(({ Qk }) => newParents.has(String(Qk)))).toEqual(
            result.resources.Qbs.map(() => true)
        );
        // And no new row holds a text of an existing row
        const existingTexts = new Set(existing.map(({ QcName }) => QcName));
        expect(result.resources.Qbs.filter(({ QcName }) => existingTexts.has(String(QcName)))).toEqual([]);
    });
});
