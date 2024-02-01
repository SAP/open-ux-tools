export { getI18nPropertiesPaths } from './i18n';

export { getI18nBundles, getCapI18nFolderNames } from './read';
export {
    createCapI18nEntries,
    createManifestI18nEntries,
    createUI5I18nEntries,
    createAnnotationI18nEntries
} from './write';

export {
    getI18nFolderNames,
    getI18nDocumentation,
    getI18nMaxLength,
    getI18nTextType,
    extractI18nKey,
    getI18nUniqueKey,
    convertToCamelCase,
    convertToPascalCase,
    printPropertiesI18nEntry,
    printPropertiesI18nAnnotation,
    csvToI18nBundle,
    jsonToI18nBundle,
    propertiesToI18nEntry,
    createCapI18nEntries as createCdsI18nEntries,
    createPropertiesI18nEntries,
    getCapI18nBundle,
    getPropertiesI18nBundle
} from '@sap-ux/i18n';
