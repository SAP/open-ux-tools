export { getI18nConfiguration, getI18nFolderNames } from './config.js';
export { getCapI18nFiles, resolveCapI18nFolderForFile, getCapI18nFolder } from './resolve.js';
export { csvPath, jsonPath, capPropertiesPath, doesExist } from './path.js';
export { printPropertiesI18nAnnotation, printPropertiesI18nEntry } from './print.js';
export {
    getI18nMaxLength,
    getI18nTextType,
    applyIndent,
    discoverIndent,
    discoverLineEnding,
    convertToCamelCase,
    convertToPascalCase
} from './text.js';
export { extractI18nKey, getI18nUniqueKey, extractDoubleCurlyBracketsKey } from './key.js';
export { readFile, writeFile } from './mem-fs-editor/index.js';
