// Stub for @sap/ux-cds-compiler-facade to prevent ESM loading issues with odata-annotation-core-types
const noop = () => {};
export const getCdsFiles = noop;
export const createCdsCompilerFacade = noop;
export const createCdsCompilerFacadeForRoot = noop;
export const createCdsCompilerFacadeForRootSync = noop;
export const createMetadataCollector = noop;
export const getMetadataElementsFromMap = noop;
export const updateContentBasedOnReference = noop;

// Export as default for ESM compatibility (used by fiori-annotation-api)
export default {
    getCdsFiles,
    createCdsCompilerFacade,
    createCdsCompilerFacadeForRoot,
    createCdsCompilerFacadeForRootSync,
    createMetadataCollector,
    getMetadataElementsFromMap,
    updateContentBasedOnReference
};
