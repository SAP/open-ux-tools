import React, { useCallback, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import type { IPopupRestoreFocusParams } from '@fluentui/react';
import { UIDefaultButton } from '../UIButton/index.js';
import { UICallout, UICalloutContentPadding } from '../UICallout/index.js';
import { UiIcons } from '../Icons.js';
import type {
    UITranslationProps,
    TranslationInputStrings,
    TranslationSuggest,
    TranslationEntry
} from './UITranslationButton.types.js';
import { SuggestValueType } from './UITranslationButton.types.js';
import { UILoadButton } from './UILoadButton.js';

import './UITranslationInput.scss';

export interface UITranslationButtonProps<T extends TranslationEntry> extends UITranslationProps<T> {
    onUpdateValue?: (value: string) => void;
    suggestion: TranslationSuggest<T>;
    /**
     * Inverted style theme
     *
     * @default false
     */
    invertedCalloutTheme?: boolean;
    /**
     * When true, skips callout focus restore after creating a new entry.
     * Use this when the host dismisses the callout and immediately opens its own
     * focus-taking UI (e.g. a dialog or QuickPick) so that focus restore does not
     * steal focus from that UI.
     *
     * @default false
     */
    preventAcceptRestoreFocus?: boolean;
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
 * Returns the CSS class names for the translation callout component.
 * Adds the base callout class and optionally an inverted theme modifier.
 *
 * @param invertedCalloutTheme - If true, applies the inverted callout theme modifier.
 * @returns A string containing the computed class names.
 */
const getCalloutClassNames = (invertedCalloutTheme?: boolean): string => {
    let classNames = ' ui-translatable__callout';
    if (invertedCalloutTheme) {
        classNames += ` ui-translatable__callout--inverted`;
    }
    return classNames;
};

/**
 * Component to render translation button to provide helper callout with i18n generation option.
 *
 * @param props Component properties.
 * @returns Component to render translation button with callout.
 */
export const UITranslationButton = <T extends TranslationEntry>(props: UITranslationButtonProps<T>): ReactElement => {
    const {
        id,
        strings,
        value,
        onCreateNewEntry,
        onUpdateValue,
        onShowExistingEntry,
        busy,
        suggestion,
        invertedCalloutTheme,
        preventAcceptRestoreFocus
    } = props;
    const [calloutVisible, setCalloutVisible] = useState(false);
    // When the callout is dismissed FluentUI restores focus to the element that was focused
    // before it opened (this button). If accepting the suggestion hands control to a host
    // dialog that takes focus (e.g. a VS Code QuickPick to choose the i18n file), that focus
    // restore would steal focus back into the webview and close the host dialog. This ref lets
    // us skip the restore for a single dismiss triggered by creating a new entry.
    const skipRestoreFocusRef = useRef(false);
    // Callbacks
    const onToggleCallout = useCallback((): void => {
        if (suggestion.suggest?.type === SuggestValueType.Existing) {
            setCalloutVisible(false);
            // Trigger show existing entry callbACK
            onShowExistingEntry?.(suggestion.suggest.entry);
        } else {
            // Opening the callout — restore focus on the next dismiss unless an accept opts out.
            skipRestoreFocusRef.current = false;
            setCalloutVisible(!calloutVisible);
        }
    }, [calloutVisible, suggestion]);
    const onAccept = useCallback((): void => {
        if (suggestion.suggest) {
            if (suggestion.suggest.type === SuggestValueType.New) {
                // Creating a new entry can hand control to a host dialog (e.g. a VS Code
                // QuickPick). Suppress the callout's focus restore for this dismiss so it does
                // not steal focus from that dialog.
                skipRestoreFocusRef.current = true;
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
    const onRestoreFocus = useCallback(
        (params: IPopupRestoreFocusParams): void => {
            if (skipRestoreFocusRef.current || preventAcceptRestoreFocus) {
                // Reset so a subsequent open restores focus as usual.
                skipRestoreFocusRef.current = false;
                return;
            }
            // Default FluentUI behavior: return focus to the element focused before the callout opened.
            // Guard with containsFocus to match FluentUI's own default: don't steal focus from an
            // element outside the callout (e.g. after a click-away dismissal).
            if (params.containsFocus) {
                params.originalElement?.focus();
            }
        },
        [preventAcceptRestoreFocus]
    );

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
                    directionalHint={5} // Bottom Center
                    calloutWidth={250}
                    calloutMinWidth={250}
                    beakWidth={8}
                    isBeakVisible={false}
                    setInitialFocus={true}
                    className={getCalloutClassNames(invertedCalloutTheme)}
                    onDismiss={onCancel}
                    onRestoreFocus={onRestoreFocus}
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
