// ESM mock for @sap/ux-cds-compiler-facade
// This avoids the CJS-require-ESM problem where ux-cds-compiler-facade (CJS)
// tries to require() workspace ESM packages (odata-annotation-core-types,
// odata-annotation-core, project-access).
// The facade is only used via fiori-annotation-api for CDS project support.

export function getMetadataElementsFromMap() { return []; }
export function createMetadataCollector() {
    return {
        collectMetadata() { return new Map(); },
        getMetadata() { return new Map(); }
    };
}
export function createCdsCompilerFacade() { return undefined; }
export function getCdsFiles() { return []; }
export async function createCdsCompilerFacadeForRoot() { return undefined; }
export function createCdsCompilerFacadeForRootSync() { return undefined; }
export function updateContentBasedOnReference() { return ''; }
