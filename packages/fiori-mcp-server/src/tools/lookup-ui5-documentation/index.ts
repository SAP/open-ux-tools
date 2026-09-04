// Public entry point for the `lookup_ui5_documentation` MCP tool.
//
// Orchestrates the lookupType-agnostic core (resolve ui5.yaml → fetch api.json → find control) and
// then dispatches to the handler registered for the requested lookupType. Adding a new lookup type is
// a two-line change: implement it under ./lookups/ and register it in LOOKUP_HANDLERS below.

import type { LookupUi5DocumentationInput } from '../../types/index.js';
import { findControl, resolveApiJson, resolveControlChain, resolveUi5Config } from './api-json.js';
import { lookupAggregation } from './lookups/aggregation.js';
import { lookupEvent } from './lookups/event.js';
import { lookupProperty } from './lookups/property.js';
import type { LookupSource, LookupUi5DocumentationResult, Ui5Symbol } from './types.js';

export type { LookupUi5DocumentationResult } from './types.js';

/**
 * A lookupType handler extracts one kind of documentation from an already-resolved inheritance chain.
 *
 * @param chain - The control's inheritance chain `[control, ...ancestors]` from `resolveControlChain`.
 * @param params - The full tool input (each handler reads the fields it needs).
 * @param source - Provenance of the api.json that produced the chain's starting control.
 * @returns The structured documentation result.
 */
type LookupHandler = (
    chain: Ui5Symbol[],
    params: LookupUi5DocumentationInput,
    source: LookupSource
) => LookupUi5DocumentationResult;

/** Registry of lookupType → handler. Keyed by the values in UI5_LOOKUP_TYPES. */
const LOOKUP_HANDLERS: Record<LookupUi5DocumentationInput['lookupType'], LookupHandler> = {
    aggregation: lookupAggregation,
    property: lookupProperty,
    event: lookupEvent
};

/**
 * Looks up UI5 control documentation from a library's designtime api.json.
 *
 * @param params - Lookup parameters (lookupType, library, control, member, appPath).
 * @returns Structured documentation for the requested control member.
 * @throws {Error} When the api.json or control cannot be resolved, or the requested member is not found.
 */
export async function lookupUi5Documentation(
    params: LookupUi5DocumentationInput
): Promise<LookupUi5DocumentationResult> {
    const { lookupType, library, control, appPath } = params;

    // Resolve ui5.yaml by walking up from appPath (or the current working directory). A missing yaml
    // simply means we go straight to the public fallback.
    const { url: configuredBase, version } = await resolveUi5Config(appPath ?? process.cwd());

    const result = await resolveApiJson(configuredBase, version, library);
    if (!result) {
        throw new Error(
            `Could not fetch api.json for ${library} (configuredBase=${configuredBase ?? 'none'}, version=${
                version ?? 'latest'
            }).`
        );
    }

    const symbol = findControl(result.data, control);
    if (!symbol) {
        throw new Error(`Control ${control} not found in ${library} api.json (source: ${result.url}).`);
    }

    // Build the inheritance chain once so handlers can resolve inherited members (often declared in an
    // ancestor class from a different library).
    const chain = await resolveControlChain(symbol, result.data, configuredBase, version);

    const usedDifferentBase = Boolean(configuredBase) && result.base !== configuredBase;
    const usedLatestFallback = Boolean(version) && !result.version;
    const source: LookupSource = {
        url: result.url,
        mode: result.source,
        base: result.base,
        version: result.version,
        fallbackUsed: usedDifferentBase || usedLatestFallback
    };

    const handler = LOOKUP_HANDLERS[lookupType];
    return handler(chain, params, source);
}
