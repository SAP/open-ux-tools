import type { SchemaGraph } from '../schema/graph.js';
import type { ExistingMockData, MockDataRow } from '../types.js';
import { semanticValueFailures } from './semantic-plan.js';
import { validateTupleDomains } from './tuple-domain.js';

type Resources = Readonly<Record<string, ReadonlyArray<MockDataRow>>>;

/** The rows of a late step once its changes that broke a final check are undone, and the number of undone cells. */
export interface FinalCheckedResult {
    resources: Resources;
    reverted: number;
}

/**
 * The fields (`EntitySet.Property`) that fail a check generation ends with: a value its planned role rejects,
 * or a row that is not a member of a value-list tuple although a compatible tuple exists.
 *
 * @param graph service schema
 * @param resources the rows
 * @param existingData the caller's existing rows
 * @param roles planned roles by field
 * @returns the failing fields
 */
export function finalCheckFailures(
    graph: SchemaGraph,
    resources: Resources,
    existingData: Readonly<Record<string, ExistingMockData>>,
    roles: Readonly<Record<string, string>>
): ReadonlySet<string> {
    const failures = new Set(semanticValueFailures(graph, resources, roles));
    for (const { code, target } of validateTupleDomains(graph, resources, existingData, roles)) {
        if (code === 'SEMANTIC_TUPLE_MEMBERSHIP_INVALID' && target !== undefined) {
            failures.add(target);
        }
    }
    return failures;
}

/**
 * Undo the changes of a step that runs after the semantic and value-list checks were last satisfied (the
 * realism guard, the standard fallback) wherever they make one of those checks fail that passed before the
 * step. Such a change would abort the whole generation, so the step gives way: a failing field restores the
 * rows of its entity set, and a failing value-list tuple also the rows of every value help of that entity
 * set, as they were before the step. Restoring repeats until no new failure is left or every involved entity
 * set is restored; a failure the step did not cause is left to the final checks.
 *
 * @param graph service schema
 * @param before the rows before the step
 * @param after the rows after the step
 * @param existingData the caller's existing rows
 * @param roles planned roles by field
 * @returns the rows to keep and the number of cells restored
 */
export function undoChangesBreakingFinalChecks(
    graph: SchemaGraph,
    before: Resources,
    after: Resources,
    existingData: Readonly<Record<string, ExistingMockData>>,
    roles: Readonly<Record<string, string>>
): FinalCheckedResult {
    const failedBefore = finalCheckFailures(graph, before, existingData, roles);
    const output: Record<string, ReadonlyArray<MockDataRow>> = { ...after };
    const restored = new Set<string>();
    for (;;) {
        const added = [...finalCheckFailures(graph, output, existingData, roles)].filter(
            (target) => !failedBefore.has(target)
        );
        const sets = new Set(
            added.flatMap((target) => involvedEntitySets(graph, target)).filter((name) => !restored.has(name))
        );
        if (sets.size === 0) {
            break;
        }
        for (const name of sets) {
            restored.add(name);
            const rows = before[name];
            if (rows === undefined) {
                delete output[name];
            } else {
                output[name] = rows;
            }
        }
    }
    let reverted = 0;
    for (const name of restored) {
        reverted += changedCells(after[name] ?? [], before[name] ?? []);
    }
    return { resources: output, reverted };
}

/**
 * The entity sets whose rows decide whether a field passes: its own and, for a value-list owner entity, the
 * value helps of all its value lists, since lists that share a field constrain each other.
 *
 * @param graph service schema
 * @param target the failing field, `EntitySet.Property`
 * @returns the entity set names
 */
function involvedEntitySets(graph: SchemaGraph, target: string): ReadonlyArray<string> {
    const entitySetName = target.slice(0, target.indexOf('.'));
    const entity = graph.entities.find((candidate) => candidate.entitySetName === entitySetName);
    const collections = (entity?.properties ?? []).flatMap(({ links }) =>
        links?.valueListCollection ? [links.valueListCollection] : []
    );
    return [entitySetName, ...collections];
}

/**
 * The number of cells that differ between two versions of the same rows.
 *
 * @param left one version
 * @param right the other version
 * @returns the count of differing cells
 */
function changedCells(left: ReadonlyArray<MockDataRow>, right: ReadonlyArray<MockDataRow>): number {
    let count = 0;
    for (let index = 0; index < Math.max(left.length, right.length); index++) {
        const a = left[index] ?? {};
        const b = right[index] ?? {};
        for (const name of new Set([...Object.keys(a), ...Object.keys(b)])) {
            if (a[name] !== b[name]) {
                count += 1;
            }
        }
    }
    return count;
}
