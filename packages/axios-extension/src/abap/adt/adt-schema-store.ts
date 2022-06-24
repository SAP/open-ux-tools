import type { AdtServices } from '.';
import type { AdtCategoryTerm, AdtCollection, AdtSchemaData } from '../types';

/**
 * This class stores the ADT schema fetched by calling ADT discovery service.
 */
export class AdtSchemaStore {
    /**
     * ADT schema is modeled as a map for fast access
     */
    private adtSchema: Record<AdtCategoryTerm, AdtCollection>;

    /**
     * Given the ID of a particular ADT service,
     * return the schema of this service.
     * @param serviceUrlPath ADT service url path that serves as unique id of a service schema
     * @returns Schema of an ADT service
     */
    public getAdtCollection(serviceUrlPath: AdtServices): AdtCollection {
        return this.adtSchema[serviceUrlPath];
    }

    /**
     * Convert the raw ADT schema data structure to
     * key-value map for fast access.
     * @param schemaData Raw ADT schema data structure that matches the XML schema
     *                   received from backend
     */
    public updateSchemaData(schemaData: AdtSchemaData): void {
        if (schemaData) {
            this.adtSchema = {};
            const workspaces = schemaData.service.workspace;
            for (let i = 0; i < workspaces.length; i++) {
                const workspace = workspaces[i];
                if (!workspace.collection) {
                    continue;
                }
                if (Array.isArray(workspace.collection)) {
                    workspace.collection.forEach((collection) => {
                        collection.workspaceTitle = workspace.title;
                        const id = collection.href;
                        this.adtSchema[id] = collection;
                    });
                } else {
                    const collection = workspace.collection as AdtCollection;
                    const id = collection.category.term;
                    this.adtSchema[id] = workspace.collection;
                }
            }
        }
    }

    /**
     * Check if an schema has been loaded and cached.
     * @returns
     */
    public isAdtSchemaEmpty(): boolean {
        return !this.adtSchema;
    }
}
