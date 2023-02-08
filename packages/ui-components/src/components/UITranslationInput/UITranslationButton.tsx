import React, { useCallback, useState } from 'react';
import type { ReactElement } from 'react';
import { UIDefaultButton } from '../UIButton';
import { UICallout, UICalloutContentPadding } from '../UICallout';
import { UiIcons } from '../Icons';
import { defaultTranslationButtonStrings } from './defaults';
import type { UITranslationProps, TranslationButtonStrings, TranslationEntry } from './UITranslationButton.types';
import { TranslationKeyGenerator } from './UITranslationButton.types';
import {
    extractI18nKey,
    generateI18nKey,
    applyI18nPattern,
    getTranslationByKey,
    getTranslationByText
} from './UITranslationUtils';

import './UITranslationInput.scss';
import { UIFormattedText, formatText } from './UIFormattedText';
import { UILoadButton } from './UILoadButton';

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

interface UITranslationButtonProps extends UITranslationProps {
    onUpdateValue?: (value: string) => void;
}

/**
 * Method to resolve button component text strings for passed key.
 * Component has default texts which can be overwritten using property `strings`.
 *
 * @param property Property.
 * @param strings Map with all text properties.
 * @returns Resolved text.
 */
const getStringText = (property: keyof TranslationButtonStrings, strings?: TranslationButtonStrings): string => {
    return strings?.[property] || '';
};

/**
 * Method returns suggestion object with message and tooltip based on passed translation button props.
 *
 * @param props Properties of translation button component.
 * @returns Translation suggestion object.
 */
const getTranslationSuggestion = (props: UITranslationButtonProps): TranslationSuggest => {
    const {
        value = '',
        allowedPatterns,
        entries,
        strings = defaultTranslationButtonStrings,
        namingConvention = TranslationKeyGenerator.CamelCase,
        defaultPattern,
        i18nPrefix,
        allowedI18nPrefixes
    } = props;
    const i18nKey = extractI18nKey(value, allowedPatterns, allowedI18nPrefixes || [i18nPrefix]);
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
    suggest.i18n = applyI18nPattern(suggest.entry.key.value, defaultPattern, i18nPrefix);
    // Format message to show in callout
    const messageValues = {
        key: suggest.entry.key.value,
        value: suggest.entry.value.value,
        i18n: suggest.i18n
    };
    tooltip = formatText(tooltip, messageValues);
    return {
        message: <UIFormattedText values={messageValues}>{message}</UIFormattedText>,
        tooltip,
        suggest
    };
};

/**
 * Component to render translation button to provide helper callout with i18n generation option.
 *
 * @param props Component properties.
 * @returns Component to render translation button with callout.
 */
export function UITranslationButton(props: UITranslationButtonProps): ReactElement {
    const { id, strings, value, onCreateNewEntry, onUpdateValue, onShowExistingEntry, busy } = props;
    const [isCalloutVisible, setCalloutVisible] = useState(false);
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
            <UILoadButton
                id={id}
                disabled={props.disabled ?? false}
                onClick={onToggleCallout}
                iconProps={{ iconName: suggestion.suggest?.icon || UiIcons.World }}
                title={suggestion.tooltip}
                busy={busy?.busy}
                useMinWaitingTime={busy?.useMinWaitingTime}
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
                            <UIDefaultButton id={`${id}-button-action-cancel`} onClick={onCancel}>
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
