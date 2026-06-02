import type { Logger } from '@sap-ux/logger';
import type { ConvertedMetadata } from '@sap-ux/vocabularies-types';
import type { CollectionFacet, FacetTypes } from '@sap-ux/vocabularies-types/vocabularies/UI';
import { UIAnnotationTypes } from '@sap-ux/vocabularies-types/vocabularies/UI';

export type FacetCollectionName = 'HeaderFacets' | 'Facets';

/** Identifies a facet by either its referenced annotation path or its `ID`. */
export interface FacetIdentifier {
    target?: string;
    id?: string;
}

/**
 * Returns the resolved hidden state of the facet from its `UI.Hidden` annotation:
 * `true` for literal `UI.Hidden = true`, `'dynamic'` for path/expression forms (which cannot
 * be evaluated at generation time), and `false` for absent or `UI.Hidden = false` annotations.
 *
 * @param pageEntitySetName - the page entity set name from the page configuration
 * @param facetCollection - which facet collection to inspect on the entity type
 * @param identifier - target/id of the facet to look up
 * @param metadata - converted metadata of the main service (with merged annotations)
 * @param log - optional logger
 * @returns the hidden state, or `false` when nothing can be determined
 */
export function isFacetHidden(
    pageEntitySetName: string | undefined,
    facetCollection: FacetCollectionName,
    identifier: FacetIdentifier,
    metadata: ConvertedMetadata | undefined,
    log?: Logger
): boolean | 'dynamic' {
    if (!metadata || !pageEntitySetName || (!identifier.target && !identifier.id)) {
        return false;
    }
    try {
        const entitySet = metadata.entitySets.find((es) => es.name === pageEntitySetName);
        if (!entitySet?.entityType) {
            return false;
        }
        const uiAnnotations = entitySet.entityType.annotations?.UI as Record<string, unknown> | undefined;
        const facets = uiAnnotations?.[facetCollection] as FacetTypes[] | undefined;
        if (!Array.isArray(facets)) {
            return false;
        }
        const facet = findFacet(facets, identifier);
        return resolveHiddenState(facet?.annotations?.UI?.Hidden);
    } catch (error) {
        log?.debug(
            `Failed to check facet hidden state for ${facetCollection} ${identifier.id ?? identifier.target ?? ''}: ${(error as Error).message}`
        );
        return false;
    }
}

/**
 * Recursively searches the given facet collection for a facet matching the identifier,
 * descending into `CollectionFacet.Facets` so sub-section identifiers also resolve.
 *
 * @param facets - facet collection to search
 * @param identifier - identifier to match against
 * @returns the matching facet, or undefined if none was found
 */
function findFacet(facets: FacetTypes[], identifier: FacetIdentifier): FacetTypes | undefined {
    for (const facet of facets) {
        if (matchesIdentifier(facet, identifier)) {
            return facet;
        }
        if (facet.$Type === UIAnnotationTypes.CollectionFacet) {
            const nested = findFacet((facet as CollectionFacet).Facets ?? [], identifier);
            if (nested) {
                return nested;
            }
        }
    }
    return undefined;
}

/**
 * Tests whether a facet matches the given identifier on either its `Target.value` or its `ID`.
 *
 * @param facet - facet candidate from the metadata
 * @param identifier - identifier to match against
 * @returns `true` if the facet matches by `Target.value` or by `ID`
 */
function matchesIdentifier(facet: FacetTypes, identifier: FacetIdentifier): boolean {
    if (identifier.target) {
        const facetTarget = (facet as { Target?: { value?: string } }).Target?.value;
        if (facetTarget && facetTarget === identifier.target) {
            return true;
        }
    }
    if (identifier.id && facet.ID?.toString() === identifier.id) {
        return true;
    }
    return false;
}

/**
 * Resolves the runtime hidden state from a `UI.Hidden` annotation value.
 * `UI.Hidden` defaults to `true` when present without a value; expression forms (Path, If, …)
 * cannot be evaluated at generation time and are reported as `'dynamic'`.
 *
 * @param hidden - the value of `annotations.UI.Hidden`
 * @returns the resolved hidden state
 */
function resolveHiddenState(hidden: unknown): boolean | 'dynamic' {
    if (hidden === undefined || hidden === null) {
        return false;
    }
    if (hidden === false) {
        return false;
    }
    if (hidden === true) {
        return true;
    }
    return 'dynamic';
}
