import { readFileSync } from 'node:fs';
import { parseCsn } from '../../src/schema/csn.js';
import { parseEdmx } from '../../src/schema/edmx.js';
import type { SchemaGraph } from '../../src/schema/graph.js';
import { effectiveValueListParameters } from '../../src/generation/value-list-context.js';

/**
 * The mappings every value-list property should carry if they derive from its parameters.
 *
 * @param graph parsed schema
 * @returns per value-list property, the declared and the derived mappings
 */
function mappingPairs(graph: SchemaGraph): ReadonlyArray<{ declared: unknown; derived: unknown }> {
    return graph.entities.flatMap((entity) =>
        entity.properties
            .filter(({ links }) => links?.valueListCollection !== undefined)
            .map((property) => {
                const derived = effectiveValueListParameters(property).flatMap(
                    ({ localProperty, valueListProperty }) =>
                        localProperty && valueListProperty ? [{ localProperty, valueListProperty }] : []
                );
                return { declared: property.links?.valueListMappings ?? [], derived };
            })
    );
}

describe('value-list parameters as the single source of value-list mappings', () => {
    it('derives every EDMX value-list mapping from the declared parameters', () => {
        // Given an EDMX service with value lists
        const graph = parseEdmx(readFileSync(new URL('./travel-v2.metadata.xml', import.meta.url), 'utf8'));
        // When its value-list properties are read
        const pairs = mappingPairs(graph);
        // Then each property's mappings are exactly the parameters with a local and a value-list property
        expect(pairs.length).toBeGreaterThan(0);
        pairs.forEach(({ declared, derived }) => expect(declared).toEqual(derived));
    });

    it('derives every CSN value-list mapping from the declared parameters', () => {
        // Given a CSN service with a value list
        const graph = parseCsn(
            JSON.stringify({
                definitions: {
                    S: { kind: 'service' },
                    'S.Orders': {
                        kind: 'entity',
                        elements: {
                            ID: { key: true, type: 'cds.String' },
                            Status: {
                                type: 'cds.String',
                                '@Common.ValueList': {
                                    CollectionPath: 'Statuses',
                                    Parameters: [
                                        {
                                            $Type: 'Common.ValueListParameterInOut',
                                            LocalDataProperty: { '=': 'Status' },
                                            ValueListProperty: 'Code'
                                        },
                                        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'Name' }
                                    ]
                                }
                            }
                        }
                    },
                    'S.Statuses': {
                        kind: 'entity',
                        elements: { Code: { key: true, type: 'cds.String' }, Name: { type: 'cds.String' } }
                    }
                }
            })
        );
        // When its value-list properties are read
        const pairs = mappingPairs(graph);
        // Then the mappings are the parameters with both properties, and the display-only one is omitted
        expect(pairs).toEqual([
            {
                declared: [{ localProperty: 'Status', valueListProperty: 'Code' }],
                derived: [{ localProperty: 'Status', valueListProperty: 'Code' }]
            }
        ]);
    });
});
