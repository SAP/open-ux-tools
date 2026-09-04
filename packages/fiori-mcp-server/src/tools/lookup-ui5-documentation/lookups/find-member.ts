// Shared inheritance-chain search used by every lookupType handler. This is the one place that walks
// a resolved control chain and reads the matching `ui5-metadata` array, so aggregation/property/event
// handlers don't each reimplement the walk.

import type { Ui5Symbol } from '../types.js';

/** A member found in the chain, together with the fully-qualified name of the class that declares it. */
export interface FoundMember<T> {
    member: T;
    definedIn: string;
}

/**
 * Finds the first member matching `name` by walking the inheritance chain from the control upward.
 * The `select` callback extracts the relevant `ui5-metadata` array (aggregations/properties/events)
 * from each symbol, keeping this function agnostic of the member kind.
 *
 * @param chain - The inheritance chain `[control, ...ancestors]` from `resolveControlChain`.
 * @param select - Extracts the member array to search from a symbol.
 * @param name - The member name to look up.
 * @returns The matching member and its declaring class, or null when not found anywhere in the chain.
 */
export function findMemberInChain<T extends { name: string }>(
    chain: Ui5Symbol[],
    select: (symbol: Ui5Symbol) => T[] | undefined,
    name: string
): FoundMember<T> | null {
    for (const symbol of chain) {
        const member = select(symbol)?.find((m) => m.name === name);
        if (member) {
            return { member, definedIn: symbol.name };
        }
    }
    return null;
}

/**
 * Collects the names of every member of one kind across the whole chain, for error messages.
 *
 * @param chain - The inheritance chain.
 * @param select - Extracts the member array from a symbol.
 * @returns Deduplicated member names, in chain order.
 */
export function knownMemberNames<T extends { name: string }>(
    chain: Ui5Symbol[],
    select: (symbol: Ui5Symbol) => T[] | undefined
): string[] {
    const names = new Set<string>();
    for (const symbol of chain) {
        for (const m of select(symbol) ?? []) {
            names.add(m.name);
        }
    }
    return [...names];
}
