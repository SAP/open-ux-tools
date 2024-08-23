import React, { useCallback, useState } from 'react';
import type { ReactElement } from 'react';
import { UIDefaultButton } from '../UIButton';
import { UICallout, UICalloutContentPadding } from '../UICallout';
import { UiIcons } from '../Icons';
import type {
    UITranslationProps,
    TranslationInputStrings,
    TranslationSuggest,
    TranslationEntry
} from './UITranslationButton.types';
import { SuggestValueType } from './UITranslationButton.types';
import { UILoadButton } from './UILoadButton';

import './UITranslationInput.scss';

export interface UITranslationButtonProps<T extends TranslationEntry> extends UITranslationProps<T> {
    onUpdateValue?: (value: string) => void;
    suggestion: TranslationSuggest<T>;
}

/**
 * Method to resolve button component text strings for passed key.
 * Component has default texts which can be overwritten using property `strings`.
 *
 * @param property Property.
 * @param strings Map with all text properties.
 * @returns Resolved text.
 */
const getStringText = (property: keyof TranslationInputStrings, strings?: TranslationInputStrings): string => {
    return strings?.[property] ?? '';
};

/**
 * Component to render translation button to provide helper callout with i18n generation option.
 *
 * @param props Component properties.
 * @returns Component to render translation button with callout.
 */
export const UITranslationButton = <T extends TranslationEntry>(props: UITranslationButtonProps<T>): ReactElement => {
    const { id, strings, value, onCreateNewEntry, onUpdateValue, onShowExistingEntry, busy, suggestion } = props;
    const [calloutVisible, setCalloutVisible] = useState(false);
    // Callbacks
    const onToggleCallout = useCallback((): void => {
        if (suggestion.suggest?.type === SuggestValueType.Existing) {
            setCalloutVisible(false);
            // Trigger show existing entry callbACK
            onShowExistingEntry?.(suggestion.suggest.entry);
        } else {
            setCalloutVisible(!calloutVisible);
        }
    }, [calloutVisible, suggestion]);
    const onAccept = useCallback((): void => {
        if (suggestion.suggest) {
            if (suggestion.suggest.type === SuggestValueType.New) {
                onCreateNewEntry?.(suggestion.suggest.entry);
            }
            if (value !== suggestion.suggest.i18n) {
                onUpdateValue?.(suggestion.suggest.i18n ?? '');
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
                iconProps={{ iconName: suggestion.suggest?.icon ?? UiIcons.World }}
                title={suggestion.tooltip}
                busy={busy?.busy}
                useMinWaitingTime={busy?.useMinWaitingTime}
            />
            {calloutVisible && (
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
};
