// Event lookup: extracts a single control event's documentation, walking the control's inheritance
// chain so inherited events (often declared in an ancestor library) resolve too.

import type { LookupUi5DocumentationInput } from '../../../types/index.js';
import type { EventLookupResult, LookupSource, Ui5Event, Ui5Symbol } from '../types.js';
import { resolveMember } from './find-member.js';

// Extracts the events array from a symbol's `ui5-metadata`.
const selectEvents = (symbol: Ui5Symbol): Ui5Event[] | undefined => symbol['ui5-metadata']?.events;

/**
 * Extracts documentation for a control event, resolving inherited events via the chain. Event
 * `parameters` are preserved as a record (their api.json shape), not flattened to an array.
 *
 * @param chain - The control's inheritance chain `[control, ...ancestors]`.
 * @param params - The tool input (the `member` field names the event).
 * @param source - Provenance of the api.json that produced the chain.
 * @returns Structured event documentation.
 * @throws {Error} When the event is not found in the chain.
 */
export function lookupEvent(
    chain: Ui5Symbol[],
    params: LookupUi5DocumentationInput,
    source: LookupSource
): EventLookupResult {
    const { library, control, member } = params;

    const { member: event, definedIn } = resolveMember(chain, selectEvents, member, control, {
        singular: 'Event',
        plural: 'events'
    });
    return {
        lookupType: 'event',
        library,
        control,
        definedIn,
        inherited: definedIn !== control,
        event: event.name,
        visibility: event.visibility,
        parameters: event.parameters,
        since: event.since ?? null,
        description: event.description ?? null,
        source
    };
}
