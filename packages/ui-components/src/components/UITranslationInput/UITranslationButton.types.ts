import type { UiIcons } from '../Icons';

export interface TranslationInputStrings {
    acceptButtonLabel: string;
    cancelButtonLabel: string;
    i18nEntryExistsTooltip: string;
    i18nKeyMissingTooltip: string;
    i18nKeyMissingDescription: string;
    i18nValueMissingTooltip: string;
    i18nValueMissingDescription: string;
    i18nReplaceWithExistingTooltip: string;
    i18nReplaceWithExistingDescription: string;
    i18nEntryExistsInputTooltip: string;
}

export enum TranslationKeyGenerator {
    CamelCase = 'CamelCase',
    PascalCase = 'PascalCase'
}

export enum TranslationTextPattern {
    // Pattern `{{}}`
    DoubleBracketReplace = 'DoubleBracketReplace',
    // Pattern `{key>}`
    SingleBracketBinding = 'SingleBracketBinding'
}

export interface TranslationEntryValue {
    value: string;
}

export interface TranslationEntry {
    key: TranslationEntryValue;
    value: TranslationEntryValue;
}

export type I18nBundle = Record<string, TranslationEntry[]>;

export interface UITranslationProps {
    value?: string;
    id: string;
    disabled?: boolean;
    // When entry exists in passed i18n entries and user clicked on show entry button
    onShowExistingEntry?: (entry: TranslationEntry) => void;
    // When creation of new i18n entry is requested
    onCreateNewEntry?: (entry: TranslationEntry) => void;
    // Loader indicator
    busy?: UILoadButtonBusyProps;
    // Opion to pass custom Texts for component's labels and tooltips
    strings?: TranslationButtonStrings;
}

export interface UILoadButtonBusyProps {
    busy?: boolean;
    // If true set, then default time is 500ms
    useMinWaitingTime?: boolean | number;
}

export enum SuggestValueType {
    Existing = 'Existing',
    Update = 'Update',
    New = 'New'
}

export interface TranslationSuggestValue {
    entry: TranslationEntry;
    icon?: UiIcons;
    type: SuggestValueType;
    i18n?: string;
}

export interface TranslationSuggest {
    tooltip: string;
    message?: React.ReactElement;
    suggest?: TranslationSuggestValue;
}
