import type { SchemaGraph } from '../schema/graph.js';
import type { ExistingMockData, MockDataGeneratorDiagnostic, MockDataRow } from '../types.js';
import { generatedRowFlags, valueListDomains } from './authored.js';

/**
 * Report generated parent rows that no generated child row references: an app shows them with an empty list of
 * children. New children reference the new parents without children first, so this only happens when the child
 * set holds fewer new rows than its parent set. The rows of a value list or code list are a domain to choose
 * from, not parents, a self-reference names a hierarchy, and contained rows report their own placement.
 *
 * @param graph - Service schema.
 * @param resources - The generated rows by entity set, contained entities as entities of their own.
 * @param existingData - The caller's existing rows.
 * @returns One info per child set and parent set whose new parent rows lack a new child.
 */
export function childlessParentDiagnostics(
    graph: SchemaGraph,
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>,
    existingData: Readonly<Record<string, ExistingMockData>>
): MockDataGeneratorDiagnostic[] {
    const entities = new Map(graph.entities.map((entity) => [entity.entitySetName, entity]));
    const domains = valueListDomains(graph);
    const reported = new Set<string>();
    const diagnostics: MockDataGeneratorDiagnostic[] = [];
    for (const { fromEntitySet, toEntitySet, mappings } of graph.relationships) {
        const child = entities.get(fromEntitySet);
        const parent = entities.get(toEntitySet);
        const pair = `${fromEntitySet}\n${toEntitySet}`;
        if (
            !child ||
            !parent ||
            fromEntitySet === toEntitySet ||
            child.containedBy !== undefined ||
            parent.codeList !== undefined ||
            domains.has(toEntitySet) ||
            reported.has(pair) ||
            mappings.length === 0
        ) {
            continue;
        }
        const childRows = resources[fromEntitySet] ?? [];
        const parentRows = resources[toEntitySet] ?? [];
        const generatedChildren = generatedRowFlags(child, childRows, existingData);
        const generatedParents = generatedRowFlags(parent, parentRows, existingData);
        const signature = (row: MockDataRow, side: 'sourceProperty' | 'targetProperty'): string =>
            JSON.stringify(mappings.map((mapping) => row[mapping[side]] ?? null));
        const referenced = new Set(
            childRows.filter((_, index) => generatedChildren[index]).map((row) => signature(row, 'sourceProperty'))
        );
        const newParents = parentRows.filter((_, index) => generatedParents[index]);
        const childless = newParents.filter((row) => !referenced.has(signature(row, 'targetProperty'))).length;
        if (childless > 0 && referenced.size < newParents.length) {
            reported.add(pair);
            diagnostics.push({
                code: 'CHILD_ROWS_FEWER_THAN_PARENTS',
                severity: 'info',
                target: fromEntitySet,
                message: `${childless} of ${newParents.length} new ${toEntitySet} rows have no new ${fromEntitySet} row referencing them.`
            });
        }
    }
    return diagnostics;
}
