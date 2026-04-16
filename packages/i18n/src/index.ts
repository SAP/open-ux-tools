export { getCapI18nBundle, getPropertiesI18nBundle } from './read/index.js';
export { createCapI18nEntries, createPropertiesI18nEntries, removeAndCreateI18nEntries } from './write/index.js';

export {
    getI18nFolderNames,
    getI18nMaxLength,
    getI18nTextType,
    extractI18nKey,
    extractDoubleCurlyBracketsKey,
    getI18nUniqueKey,
    convertToCamelCase,
    convertToPascalCase,
    printPropertiesI18nEntry,
    printPropertiesI18nAnnotation
} from './utils/index.js';

export type {
    CdsEnvironment,
    CdsI18nConfiguration,
    CdsI18nEnv,
    I18nAnnotation,
    I18nAnnotationNode,
    I18nBundle,
    I18nEntry,
    NewI18nEntry,
    SapTextType,
    ValueNode
} from './types.js';

export { SapLongTextType, SapShortTextType } from './types.js';

export { csvToI18nBundle, jsonToI18nBundle, propertiesToI18nEntry } from './transformer/index.js';
