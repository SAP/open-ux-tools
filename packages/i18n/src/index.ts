export { getCapI18nBundle, getPropertiesI18nBundle } from './read';
export { createCapI18nEntry, createPropertiesI18nEntry } from './write';

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
    SapTextType
} from './types';

export { initI18n, i18n } from './i18n';

import { initI18n } from './i18n';

// init i18n
(async (): Promise<void> => {
    await initI18n();
})();
