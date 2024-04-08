export { getI18nConfiguration, getI18nFolderNames } from './config';
export { getCapI18nFiles, resolveCapI18nFolderForFile, getCapI18nFolder } from './resolve';
export { csvPath, jsonPath, capPropertiesPath, doesExist } from './path';
export { printPropertiesI18nAnnotation, printPropertiesI18nEntry } from './print';
export {
    getI18nMaxLength,
    getI18nTextType,
    applyIndent,
    discoverIndent,
    discoverLineEnding,
    convertToCamelCase,
    convertToPascalCase
} from './text';
export { extractI18nKey, getI18nUniqueKey, extractDoubleCurlyBracketsKey } from './key';
export { readFile, writeFile } from './mem-fs-editor';
