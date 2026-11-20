import type { JsonValue, MockDataRow } from '../types.js';
import { memberValue } from './value-list-context.js';
import type { ValueListTupleMember } from './value-list-context.js';
import { sameValue } from './rows.js';

/**
 * One value list of an owner row taking part in a joint tuple choice.
 */
interface TupleChoiceList {
    /** Stable identifier of the value list (its owner target). */
    id: string;
    /** Owner fields the list's tuple determines. */
    members: ReadonlyArray<ValueListTupleMember>;
    /** Value-help rows the owner row could adopt on its own (constants, facets, protected fields). */
    candidates: ReadonlyArray<MockDataRow>;
}

type TupleChoiceResult =
    | { status: 'solved'; choices: ReadonlyMap<string, MockDataRow> }
    | { status: 'unsatisfiable' }
    | { status: 'exhausted' };

/** Upper bound on candidate visits for one joint choice; small value helps finish far below it. */
const TUPLE_CHOICE_BUDGET = 50_000;

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
 * Choose one value-help tuple per value list so that every owner field shared by several lists receives the same value.
 * The search is exhaustive, depth first with forward checking and bounded by `budget` visits; `rotation` varies the
 * chosen tuple between owner rows.
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
    const prepared = lists.map((list) => preparedTupleList(list, rotation));
    if (prepared.some(({ candidates }) => candidates.length === 0)) {
        return { status: 'unsatisfiable' };
    }
    const search: TupleSearch = { lists: prepared, budget, visits: 0, assigned: new Map(), choices: new Map() };
    const outcome = visitTupleChoices(search);
    return outcome === 'solved' ? { status: 'solved', choices: search.choices } : { status: outcome };
}

/** The state of one backtracking search for consistent tuple choices. */
interface TupleSearch {
    lists: ReadonlyArray<TupleChoiceList>;
    budget: number;
    /** Candidate visits so far. */
    visits: number;
    /** The value assigned to each local property by the choices made. */
    assigned: Map<string, JsonValue | undefined>;
    /** The chosen candidate per list id. */
    choices: Map<string, MockDataRow>;
}

/**
 * A list's candidates without repeated member tuples, rotated so different calls start at different candidates.
 *
 * @param list the choice list
 * @param rotation the rotation offset
 * @returns the list with its prepared candidates
 */
function preparedTupleList(list: TupleChoiceList, rotation: number): TupleChoiceList {
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
}

/**
 * Whether a candidate agrees with every value already assigned to the list's members.
 *
 * @param search the search
 * @param list the choice list
 * @param candidate the candidate row
 * @returns true for a consistent candidate
 */
function consistentCandidate(search: TupleSearch, list: TupleChoiceList, candidate: MockDataRow): boolean {
    return list.members.every(
        (member) =>
            !search.assigned.has(member.localProperty.name) ||
            sameValue(search.assigned.get(member.localProperty.name), memberValue(member, candidate))
    );
}

/**
 * The unchosen list with the fewest consistent candidates (the first such list on ties).
 *
 * @param search the search
 * @returns that list and its options, `unsatisfiable` when a list has none, or undefined when all are chosen
 */
function mostConstrainedList(
    search: TupleSearch
): { list: TupleChoiceList; options: MockDataRow[] } | 'unsatisfiable' | undefined {
    let next: { list: TupleChoiceList; options: MockDataRow[] } | undefined;
    for (const list of search.lists) {
        if (search.choices.has(list.id)) {
            continue;
        }
        const options = list.candidates.filter((candidate) => consistentCandidate(search, list, candidate));
        if (options.length === 0) {
            return 'unsatisfiable';
        }
        if (!next || options.length < next.options.length) {
            next = { list, options };
        }
    }
    return next;
}

/**
 * Assign the member values of a candidate to the properties not assigned yet.
 *
 * @param search the search
 * @param list the choice list
 * @param candidate the chosen candidate
 * @returns the properties newly assigned, to undo the choice
 */
function assignCandidate(search: TupleSearch, list: TupleChoiceList, candidate: MockDataRow): string[] {
    const added: string[] = [];
    for (const member of list.members) {
        if (!search.assigned.has(member.localProperty.name)) {
            search.assigned.set(member.localProperty.name, memberValue(member, candidate));
            added.push(member.localProperty.name);
        }
    }
    return added;
}

/**
 * Choose a candidate for the most constrained list and recurse, backtracking on failure.
 *
 * @param search the search
 * @returns `solved` with every list chosen, `unsatisfiable`, or `exhausted` when the budget runs out
 */
function visitTupleChoices(search: TupleSearch): 'solved' | 'unsatisfiable' | 'exhausted' {
    const next = mostConstrainedList(search);
    if (next === 'unsatisfiable') {
        return next;
    }
    if (!next) {
        return 'solved';
    }
    for (const candidate of next.options) {
        search.visits += 1;
        if (search.visits > search.budget) {
            return 'exhausted';
        }
        const added = assignCandidate(search, next.list, candidate);
        search.choices.set(next.list.id, candidate);
        const outcome = visitTupleChoices(search);
        if (outcome !== 'unsatisfiable') {
            return outcome;
        }
        added.forEach((name) => search.assigned.delete(name));
        search.choices.delete(next.list.id);
    }
    return 'unsatisfiable';
}
