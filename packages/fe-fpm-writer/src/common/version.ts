export function validateVersion(ui5Version?: number): boolean {
    if (ui5Version && ui5Version < 1.84) {
        throw new Error('SAP Fiori elements for OData v4 is only supported starting with SAPUI5 1.84.');
    }
    return true;
}
