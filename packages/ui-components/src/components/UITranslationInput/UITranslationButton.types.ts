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

export type I18nBundle<T extends TranslationEntry = TranslationEntry> = Record<string, T[]>;

export interface UITranslationProps<T extends TranslationEntry = TranslationEntry> {
    value?: string;
    id: string;
    disabled?: boolean;
    // When entry exists in passed i18n entries and user clicked on show entry button
    onShowExistingEntry?: (entry: T) => void;
    // When creation of new i18n entry is requested
    onCreateNewEntry?: (entry: TranslationEntry) => void;
    // Loader indicator
    busy?: UILoadButtonBusyProps;
    // Opion to pass custom Texts for component's labels and tooltips
    strings?: TranslationInputStrings;
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

export interface TranslationSuggestValue<T extends TranslationEntry = TranslationEntry> {
    entry: T;
    icon?: UiIcons;
    type: SuggestValueType;
    i18n?: string;
}

export interface TranslationSuggest<T extends TranslationEntry = TranslationEntry> {
    tooltip: string;
    message?: React.ReactElement;
    suggest?: TranslationSuggestValue<T>;
}
