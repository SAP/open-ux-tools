export { getCapI18nBundle, getPropertiesI18nBundle } from './read';
export { createCapI18nEntries, createPropertiesI18nEntries } from './write';

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
} from './utils';

export {
    CdsEnvironment,
    CdsI18nConfiguration,
    CdsI18nEnv,
    I18nAnnotation,
    I18nAnnotationNode,
    I18nBundle,
    I18nEntry,
    NewI18nEntry,
    SapLongTextType,
    SapShortTextType,
    SapTextType,
    ValueNode
} from './types';

export { csvToI18nBundle, jsonToI18nBundle, propertiesToI18nEntry } from './transformer';
