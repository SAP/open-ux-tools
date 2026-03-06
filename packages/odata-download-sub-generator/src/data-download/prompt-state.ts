/**
 * Class to manage prompt state including caches for external services and reference facets.
 */
export class PromptState {
    // Cache downloaded entity sets since multiple targets within the same service may refer to the same entity set.
    // We only need to download the entity set once. Entity name is unique within the service.
    public static externalServiceRequestCache: Record<string, string[]> = {};

    // Cache of reference facet paths to prevent re-processing of same metadata repeatedly
    public static entityTypeRefFacetCache: Record<string, string[]> = {};

    /**
     * Reset the external service request cache.
     *
     * @param extServicePath - Optional specific service path to reset. If not provided, resets entire cache.
     */
    static resetExternalServiceCache(extServicePath?: string): void {
        if (extServicePath) {
            delete PromptState.externalServiceRequestCache[extServicePath];
            return;
        }
        PromptState.externalServiceRequestCache = {};
    }

    static resetRefFacetCache(): void {
        this.entityTypeRefFacetCache = {};
    }

    static resetServiceCaches(): void {
        PromptState.resetExternalServiceCache();
        PromptState.resetRefFacetCache();
    }
}
