import type { JsonValue, MockDataRow } from '../types.js';
import { memberValue } from './value-list-context.js';
import type { ValueListTupleMember } from './value-list-context.js';

/**
 * One value list of an owner row taking part in a joint tuple choice.
 */
export interface TupleChoiceList {
    /** Stable identifier of the value list (its owner target). */
    id: string;
    /** Owner fields the list's tuple determines. */
    members: ReadonlyArray<ValueListTupleMember>;
    /** Value-help rows the owner row could adopt on its own (constants, facets, protected fields). */
    candidates: ReadonlyArray<MockDataRow>;
}

export type TupleChoiceResult =
    | { status: 'solved'; choices: ReadonlyMap<string, MockDataRow> }
    | { status: 'unsatisfiable' }
    | { status: 'exhausted' };

/** Upper bound on candidate visits for one joint choice; small value helps finish far below it. */
export const TUPLE_CHOICE_BUDGET = 50_000;

function sameValue(left: JsonValue | undefined, right: JsonValue | undefined): boolean {
    return Object.is(left, right) || JSON.stringify(left) === JSON.stringify(right);
}

/**
 * Value lists connected to `start` through shared owner fields (transitively).
 *
 * @param start the value list to begin from
 * @param lists all value lists of the owner entity
 * @returns the connected component, `start` first
 */
export function sharingComponent<T extends Pick<TupleChoiceList, 'members'>>(
    start: T,
    lists: ReadonlyArray<T>
): ReadonlyArray<T> {
    const component: T[] = [start];
    const fields = new Set(start.members.map(({ localProperty }) => localProperty.name));
    let grew = true;
    while (grew) {
        grew = false;
        for (const list of lists) {
            if (!component.includes(list) && list.members.some(({ localProperty }) => fields.has(localProperty.name))) {
                component.push(list);
                list.members.forEach(({ localProperty }) => fields.add(localProperty.name));
                grew = true;
            }
        }
    }
    return component;
}

/**
 * Choose one value-help tuple per value list so that every owner field shared by several lists
 * receives the same value from each of them.
 *
 * The search is exhaustive and depth first. It always continues with the unassigned list that has
 * the fewest candidates consistent with the fields chosen so far, and backtracks as soon as any
 * unassigned list has none left (forward checking), so lists that share no field never multiply the
 * search. Candidates that carry identical owner values are collapsed, and the search is bounded by
 * `budget` candidate visits. `rotation` rotates each list's candidate order so different owner rows
 * pick different, equally valid tuples.
 *
 * @param lists value lists with their individually adoptable candidates
 * @param rotation deterministic rotation of candidate order (for example the owner row index)
 * @param budget maximum candidate visits before the search reports exhaustion
 * @returns the chosen tuple per list, proof that none exists, or exhaustion of the budget
 */
export function solveTupleChoice(
    lists: ReadonlyArray<TupleChoiceList>,
    rotation = 0,
    budget = TUPLE_CHOICE_BUDGET
): TupleChoiceResult {
    const prepared = lists.map((list) => {
        const seen = new Set<string>();
        const unique = list.candidates.filter((candidate) => {
            const signature = JSON.stringify(list.members.map((member) => memberValue(member, candidate)));
            if (seen.has(signature)) {
                return false;
            }
            seen.add(signature);
            return true;
        });
        const offset = unique.length === 0 ? 0 : rotation % unique.length;
        return { ...list, candidates: [...unique.slice(offset), ...unique.slice(0, offset)] };
    });
    if (prepared.some(({ candidates }) => candidates.length === 0)) {
        return { status: 'unsatisfiable' };
    }
    const assigned = new Map<string, JsonValue | undefined>();
    const choices = new Map<string, MockDataRow>();
    const consistent = (list: TupleChoiceList, candidate: MockDataRow): boolean =>
        list.members.every(
            (member) =>
                !assigned.has(member.localProperty.name) ||
                sameValue(assigned.get(member.localProperty.name), memberValue(member, candidate))
        );
    let visits = 0;
    const visit = (): 'solved' | 'unsatisfiable' | 'exhausted' => {
        let next: { list: TupleChoiceList; options: MockDataRow[] } | undefined;
        for (const list of prepared) {
            if (choices.has(list.id)) {
                continue;
            }
            const options = list.candidates.filter((candidate) => consistent(list, candidate));
            if (options.length === 0) {
                return 'unsatisfiable';
            }
            if (!next || options.length < next.options.length) {
                next = { list, options };
            }
        }
        if (!next) {
            return 'solved';
        }
        for (const candidate of next.options) {
            visits += 1;
            if (visits > budget) {
                return 'exhausted';
            }
            const added: string[] = [];
            for (const member of next.list.members) {
                if (!assigned.has(member.localProperty.name)) {
                    assigned.set(member.localProperty.name, memberValue(member, candidate));
                    added.push(member.localProperty.name);
                }
            }
            choices.set(next.list.id, candidate);
            const outcome = visit();
            if (outcome !== 'unsatisfiable') {
                return outcome;
            }
            added.forEach((name) => assigned.delete(name));
            choices.delete(next.list.id);
        }
        return 'unsatisfiable';
    };
    const outcome = visit();
    return outcome === 'solved' ? { status: 'solved', choices } : { status: outcome };
}
