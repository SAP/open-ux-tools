import React, { useCallback, useState } from 'react';
import type { ReactElement } from 'react';
import { UIDefaultButton, UIIconButton } from '../UIButton';
import { UICallout, UICalloutContentPadding } from '../UICallout';
import { UiIcons } from '../Icons';
import { defaultTranslationButtonStrings } from './defaults';
import type {
    UITranslationButtonProps,
    TranslationButtonStrings,
    //TranslationTextPattern,
    TranslationEntry,
    I18nBundle
} from './UITranslationButton.types';
import { TranslationKeyGenerator, TranslationTextPattern } from './UITranslationButton.types';
import { extractI18nKey, generateI18nKey } from './UITranslationUtils';

import './UITranslationInput.scss';
import { UIFormattedText } from './UIFormattedText';

export enum SuggestValueType {
    Existing = 'Existing',
    Update = 'Update',
    New = 'New'
}

interface TranslationSuggestValue {
    entry: TranslationEntry;
    icon?: UiIcons;
    type: SuggestValueType;
    i18n?: string;
}

interface TranslationSuggest {
    tooltip: string;
    message?: React.ReactElement;
    suggest?: TranslationSuggestValue;
}

const getI18nMarkup = (key: string, prefix: string, pattern: TranslationTextPattern): string => {
    return pattern === TranslationTextPattern.DoubleBracketReplace ? `{{${key}}}` : `{${prefix}>${key}}`;
};

const getStringText = (key: keyof TranslationButtonStrings, strings?: TranslationButtonStrings): string => {
    return strings?.[key] || '';
};

const getTranslationByKey = (bundle: I18nBundle, key: string): TranslationEntry | undefined => {
    const entries = bundle[key];
    if (entries?.length > 0) {
        return entries[0];
    }
};

/**
 * Method finds existing i81n key searching by value.
 * @param {I18nBundle} bundle Search for value.
 * @param {string} value Search for value.
 * @returns {TranslationEntry | undefined} Key if value is found.
 */
const getTranslationByText = (bundle: I18nBundle, value: string): TranslationEntry | undefined => {
    for (const key in bundle) {
        const entries = bundle[key];
        if (entries.length) {
            const first = entries[0];
            if (first.value.value === value) {
                return first;
            }
        }
    }
};

const getTranslationSuggestion = (props: UITranslationButtonProps): TranslationSuggest => {
    const {
        value = '',
        allowedPatterns,
        entries,
        strings = defaultTranslationButtonStrings,
        namingConvention = TranslationKeyGenerator.CamelCase,
        defaultPattern,
        i18nPrefix
    } = props;
    const i18nKey = extractI18nKey(value, allowedPatterns, i18nPrefix);
    let message = '';
    let tooltip = '';
    let suggest: TranslationSuggestValue;
    if (i18nKey) {
        // There is already i18n binding as value
        const entry = getTranslationByKey(entries, i18nKey);
        if (entry) {
            tooltip = strings.i18nEntryExistsTooltip;
            suggest = {
                entry,
                type: SuggestValueType.Existing,
                icon: UiIcons.WorldArrow
            };
        } else {
            message = strings.i18nKeyMissingDescription;
            tooltip = strings.i18nKeyMissingTooltip;
            suggest = {
                entry: {
                    key: {
                        value: i18nKey
                    },
                    value: {
                        value: i18nKey
                    }
                },
                type: SuggestValueType.New,
                icon: UiIcons.WorldWarning
            };
        }
    } else {
        // Use generation format passed from outside or use default as 'Standard';
        //i18nValueFormat = generateFormat || TRANSLATION_VALUE_FORMAT_BINDING;
        const existingEntry = getTranslationByText(entries, value);
        if (existingEntry) {
            message = strings.i18nReplaceWithExistingDescription;
            tooltip = strings.i18nReplaceWithExistingTooltip;
            suggest = {
                entry: existingEntry,
                type: SuggestValueType.Update
            };
        } else {
            message = strings.i18nValueMissingDescription;
            tooltip = strings.i18nValueMissingTooltip;
            const key = generateI18nKey(value, namingConvention, entries);
            suggest = {
                entry: {
                    key: {
                        value: key
                    },
                    value: {
                        value
                    }
                },
                type: SuggestValueType.New
            };
        }
    }
    // I18n string to apply for input value
    suggest.i18n = getI18nMarkup(suggest.entry.key.value, i18nPrefix, defaultPattern);
    // Format message to show in callout
    const messageValues = {
        key: suggest.entry.key.value,
        value: suggest.entry.value.value,
        i18n: suggest.i18n
    };
    // const text = format(message, {
    //     key: suggest.entry.key.value,
    //     value: suggest.entry.value.value,
    //     i18n: suggest.i18n
    // });
    //tooltip = format(tooltip, messageValues);
    tooltip = '';
    return {
        message: <UIFormattedText values={messageValues}>{message}</UIFormattedText>,
        tooltip,
        suggest
    };
};

export function UITranslationButton(props: UITranslationButtonProps): ReactElement {
    const { id, strings, value, onCreateNewEntry, onUpdateValue, onShowExistingEntry } = props;
    const [isCalloutVisible, setCalloutVisible] = useState(false);
    // ToDo - store 'suggestion' in State???
    const suggestion = getTranslationSuggestion(props);
    // Callbacks
    const onToggleCallout = useCallback((): void => {
        if (suggestion.suggest?.type === SuggestValueType.Existing) {
            setCalloutVisible(false);
            // Trigger show existing entry callbACK
            onShowExistingEntry?.(suggestion.suggest.entry);
        } else {
            setCalloutVisible(!isCalloutVisible);
        }
    }, [isCalloutVisible, suggestion]);
    const onAccept = useCallback((): void => {
        if (suggestion.suggest) {
            if (suggestion.suggest.type === SuggestValueType.New) {
                onCreateNewEntry?.(suggestion.suggest.entry);
            }
            if (value !== suggestion.suggest.i18n) {
                onUpdateValue?.(suggestion.suggest.i18n || '');
            }
        }

        setCalloutVisible(false);
    }, [suggestion, onCreateNewEntry, onUpdateValue, value]);
    const onCancel = useCallback((): void => {
        setCalloutVisible(false);
    }, []);

    return (
        <div className="ui-translatable__button">
            <UIIconButton
                id={id}
                disabled={props.disabled ?? false}
                //className={`${this.state.isCalloutVisible ? 'active' : ''}`}
                onClick={onToggleCallout}
                iconProps={{ iconName: suggestion.suggest?.icon || UiIcons.World }}
                title={suggestion.tooltip}
            />
            {isCalloutVisible && (
                <UICallout
                    target={`#${id}`}
                    gapSpace={5}
                    directionalHint={6}
                    calloutWidth={250}
                    calloutMinWidth={250}
                    beakWidth={8}
                    isBeakVisible={false}
                    setInitialFocus={true}
                    className="ui-translatable__callout"
                    onDismiss={() => onToggleCallout()}
                    contentPadding={UICalloutContentPadding.Standard}>
                    <div className="ui-translatable__message">
                        {suggestion.message}
                        <div className="ui-translatable__actions">
                            <UIDefaultButton id={`${id}-button-action-confirm`} primary onClick={onAccept}>
                                {getStringText('acceptButtonLabel', strings)}
                            </UIDefaultButton>
                            <UIDefaultButton id={`${id}-button-action-confirm`} onClick={onCancel}>
                                {getStringText('cancelButtonLabel', strings)}
                            </UIDefaultButton>
                        </div>
                    </div>
                </UICallout>
            )}
        </div>
    );
}

UITranslationButton.defaultProps = {
    strings: defaultTranslationButtonStrings
};
