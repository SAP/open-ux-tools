/**
 * Validate that the UI5 version requirement is valid.
 *
 * @param ui5Version - optional minimum required UI5 version
 * @returns true if the version is supported otherwise throws an error
 */
export function validateVersion(ui5Version?: number): boolean {
    if (ui5Version && ui5Version < 1.84) {
        throw new Error('SAP Fiori elements for OData v4 is only supported starting with SAPUI5 1.84.');
    }
    return true;
}
