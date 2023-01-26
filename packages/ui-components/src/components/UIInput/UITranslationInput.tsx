import React from 'react';
import type { ReactElement } from 'react';

export enum TranslationKeyGenerator {
    CamelCase = 'CamelCase',
    PascalCase = 'PascalCase'
}

export interface TranslationEntry {
    key: string;
    value: string;
}

export type I18nBundle = Record<string, TranslationEntry[]>;


// // Format using sapui5 binding syntax like "{i18n>value}"
// export const TRANSLATION_VALUE_FORMAT_BINDING = 'binding';
// // Format using replace syntax like {{value}}
// export const TRANSLATION_VALUE_FORMAT_REPLACE = 'replace';
// export type TranslationValueFormat = typeof TRANSLATION_VALUE_FORMAT_BINDING | typeof TRANSLATION_VALUE_FORMAT_REPLACE;


export interface UITranslationInputProps {
    // Questionsable/refactor properties
    // appId?: string;
    // appJsonFilePath?: string;
    // name: string;
    // i18nPrefix?: string;
    // path?: PropertyPath;
    // // Default value is 'binding'
    // generateFormat?: TranslationValueFormat;

    entries: I18nBundle;
    // When entry exists in passed i18n entries and user clicked on show entry button
    // ToDo - param
    onShowExistingEntry?: () => void;
    // When creation of new i18n entry is requested
    onCreateNewEntry?: () => void;
    // PascalCase or camelCase to be used for key generation
    // Default value is -> ???
    namingConvention?: TranslationKeyGenerator;
    // Loader indicator
    busy?: boolean;
}

export function UITranslationInput(props: UITranslationInputProps): ReactElement {
    return <div>UITranslationInput</div>;
}
