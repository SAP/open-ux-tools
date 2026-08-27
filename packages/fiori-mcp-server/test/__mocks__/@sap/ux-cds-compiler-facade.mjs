// ESM mock for @sap/ux-cds-compiler-facade
// Jest's ESM mode cannot extract named exports from .cjs files automatically.
// This ESM wrapper exports stubs as proper named ESM exports.
const noop = () => {};
const asyncEmptyArray = async () => [];

const facadeHandler = {
    get(target, prop) {
        if (prop in target) {
            return target[prop];
        }
        return (...args) => {
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

export const getMetadataElementsFromMap = noop;
export const createMetadataCollector = noop;
export const createCdsCompilerFacade = asyncMockFacade;
export const getCdsFiles = asyncEmptyArray;
export const createCdsCompilerFacadeForRoot = asyncMockFacade;
export const createCdsCompilerFacadeForRootSync = () => mockFacade;
export const updateContentBasedOnReference = noop;

export default {
    getMetadataElementsFromMap: noop,
    createMetadataCollector: noop,
    createCdsCompilerFacade: asyncMockFacade,
    getCdsFiles: asyncEmptyArray,
    createCdsCompilerFacadeForRoot: asyncMockFacade,
    createCdsCompilerFacadeForRootSync: () => mockFacade,
    updateContentBasedOnReference: noop
};
