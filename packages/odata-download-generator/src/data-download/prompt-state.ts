/**
 *
 */
export class PromptState {
    // External service entity set map
    // Track downloaded entity sets since multiple targets within the same service may refer to the same entity set.
    // We only need to download the entity set once. Entity name is unique within the service.
    public static externalServiceRequestCache: Record<string, string[]> = {};

    /**
     *
     * @param extServicePath
     */
    static reset(extServicePath?: string): void {
        if (extServicePath) {
            delete PromptState.externalServiceRequestCache[extServicePath];
            return;
        }
        PromptState.externalServiceRequestCache = {};
    }
}
