import type { AdtCategoryTerm, AdtCollection, AdtSchemaData, AdtWorkspace } from '../types';

export class AdtSchemaStore {
    private adtSchema: Record<AdtCategoryTerm, AdtCollection>;

    public getAdtCollection(term: AdtCategoryTerm): AdtCollection {
        return this.adtSchema[term];
    }

    public updateSchemaData(schemaData: AdtSchemaData) {
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
                        const id = collection.category.term;
                        this.adtSchema[id] = collection;
                    });
                } else {
                    const collection = workspace.collection as AdtCollection;
                    const id = collection.category.term;
                    this.adtSchema[id] = JSON.parse(JSON.stringify(workspace.collection));
                }
            }
        }
    }

    public isAdtSchemaEmpty() {
        return !this.adtSchema;
    }
}
