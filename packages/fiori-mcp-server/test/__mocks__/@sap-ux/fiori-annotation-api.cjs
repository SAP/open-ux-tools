// Stub for @sap-ux/fiori-annotation-api — prevents the real package (and its static ESM import of
// @sap/ux-cds-compiler-facade) from loading under jest's --experimental-vm-modules. add-building-block.ts
// imports writeAnnotationShells -> this package, so any suite that loads the tool/server chain needs it stubbed.
// Only the symbols imported by building-block-annotations.ts need to be present.
const ChangeType = {
    InsertAnnotation: 'insert-annotation',
    DeleteAnnotation: 'delete-annotation',
    UpdateAnnotation: 'update-annotation'
};

class FioriAnnotationService {
    static async createService() {
        // Default no-op service: no writable annotation file, empty schema. Tests that exercise annotation
        // writing mock building-block-annotations.ts directly or import this and override as needed.
        return {
            sync: async () => undefined,
            getAllFiles: () => [],
            getSchema: () => ({ schema: { entitySets: [], annotations: {} } }),
            edit: () => undefined,
            save: async () => undefined
        };
    }
}

module.exports = { FioriAnnotationService, ChangeType };
