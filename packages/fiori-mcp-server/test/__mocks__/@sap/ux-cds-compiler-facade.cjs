// Mock for @sap/ux-cds-compiler-facade
// This CJS package requires ESM workspace packages, causing
// "Must use import to load ES Module" errors in Jest ESM mode.
// Export stub functions for all named exports so ESM import { ... } works.
// Uses Proxy to auto-handle any method call on the facade object.
const noop = () => {};
const asyncEmptyArray = async () => [];

// Create a facade proxy that returns safe defaults for any method call
const facadeHandler = {
    get(target, prop) {
        if (prop in target) {
            return target[prop];
        }
        // Return a function that returns empty/safe defaults
        return (...args) => {
            // If called with a callback, call it
            if (typeof args[args.length - 1] === 'function') {
                return args[args.length - 1]();
            }
            return [];
        };
    }
};

const baseFacade = {
    getCompilerErrors: () => new Map(),
    getMetadata: () => ({}),
    getService: () => ({}),
    getEdmx: () => '',
    getFileSequence: () => [],
    getFileName: () => '',
    getPropagatedTargetMap: () => ({ propagationMap: new Map(), sourceUris: [] }),
    getMetadataElementsFromMap: () => [],
    getVocabularyInformation: () => ({})
};

const mockFacade = new Proxy(baseFacade, facadeHandler);
const asyncMockFacade = async () => mockFacade;

module.exports = {
    getMetadataElementsFromMap: noop,
    createMetadataCollector: noop,
    createCdsCompilerFacade: asyncMockFacade,
    getCdsFiles: asyncEmptyArray,
    createCdsCompilerFacadeForRoot: asyncMockFacade,
    createCdsCompilerFacadeForRootSync: () => mockFacade,
    updateContentBasedOnReference: noop
};
