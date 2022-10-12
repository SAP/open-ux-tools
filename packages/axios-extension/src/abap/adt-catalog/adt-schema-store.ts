import type { AdtCategory, AdtCategoryId, AdtCollection, AdtSchemaData } from '../types';

/**
 * This class stores the ADT schema fetched by calling ADT discovery service.
 */
export class AdtSchemaStore {
    /**
     * ADT schema is modeled as a map for fast access
     */
    private adtSchema: Record<AdtCategoryId, AdtCollection>;

    /**
     * Given the ID of a particular ADT service, return the schema of this service.
     *
     * @param adtCategory ADT service serves as unique id of a service schema
     * @returns Schema of an ADT service
     */
    public getAdtCollection(adtCategory: AdtCategory): AdtCollection {
        if (!this.adtSchema) {
            return null;
        }
        const id = this.serializeAdtCategory(adtCategory);
        return this.adtSchema[id];
    }

    /**
     * Convert the raw ADT schema data structure toP
     *
     * key-value map for fast access.
     *
     * @param schemaData Raw ADT schema data structure that matches the XML schema
     *                   received from backend
     */
    public updateSchemaData(schemaData: AdtSchemaData): void {
        if (schemaData) {
            this.adtSchema = {};
            const workspaces = schemaData.service.workspace;
            for (const workspace of workspaces) {
                if (!workspace.collection) {
                    continue;
                }
                if (Array.isArray(workspace.collection)) {
                    workspace.collection.forEach((collection) => {
                        collection.workspaceTitle = workspace.title;
                        const id = this.serializeAdtCategory(collection.category);
                        this.adtSchema[id] = collection;
                    });
                } else {
                    const collection = workspace.collection;
                    const id = this.serializeAdtCategory(collection.category);
                    this.adtSchema[id] = workspace.collection;
                }
            }
        }
    }

    /**
     * Check if an schema has been loaded and cached.
     *
     * @returns boolean isAdtSchemaEmpty
     */
    public isAdtSchemaEmpty(): boolean {
        return !this.adtSchema;
    }

    /**
     *
     * @param adtCategory adtCategory
     * @returns string serializeAdtCategory
     */
    private serializeAdtCategory(adtCategory: AdtCategory): string {
        return `${adtCategory.scheme},${adtCategory.term}`;
    }
}
