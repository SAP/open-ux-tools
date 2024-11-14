import React, { useCallback } from 'react';
import type { ReactElement } from 'react';
import { UITextInput } from '../UIInput';
import type { ITextFieldProps } from '../UIInput';
import { UiIcons } from '../Icons';
import { UITranslationButton } from './UITranslationButton';
import type {
    UITranslationProps,
    TranslationSuggestValue,
    TranslationSuggest,
    I18nBundle,
    TranslationTextPattern,
    TranslationEntry
} from './UITranslationButton.types';
import { TranslationKeyGenerator, SuggestValueType } from './UITranslationButton.types';
import {
    extractI18nKey,
    generateI18nKey,
    applyI18nPattern,
    getTranslationByKey,
    getTranslationByText
} from './UITranslationUtils';
import { defaultTranslationInputStrings } from './defaults';
import { UIFormattedText, formatText } from './UIFormattedText';

export interface UITranslationInputProps<T extends TranslationEntry> extends ITextFieldProps, UITranslationProps<T> {
    id: string;
    // Existing I18n entries
    entries: I18nBundle<T>;
    // PascalCase or camelCase to be used for key generation
    // Default value is 'CamelCase'
    namingConvention?: TranslationKeyGenerator;
    // Default i18n prefix for "SingleBracketBinding"
    i18nPrefix: string;
    // Option to pass multiple allowed prefixes - if not passed then single "i18nPrefix" considered as allowed
    allowedI18nPrefixes?: string[];
    // Default pattern
    defaultPattern: TranslationTextPattern;
    // Allowed pattern
    allowedPatterns: TranslationTextPattern[];
}

/**
 * Method returns suggestion object with message and tooltip based on passed translation button props.
 *
 * @param props Properties of translation input component.
 * @returns Translation suggestion object.
 */
const getTranslationSuggestion = <T extends TranslationEntry>(
    props: UITranslationInputProps<T>
): TranslationSuggest<T> => {
    const {
        value = '',
        allowedPatterns,
        entries,
        strings = defaultTranslationInputStrings,
        namingConvention = TranslationKeyGenerator.CamelCase,
        defaultPattern,
        i18nPrefix,
        allowedI18nPrefixes
    } = props;
    const i18nKey = extractI18nKey(value, allowedPatterns, allowedI18nPrefixes || [i18nPrefix]);
    let message = '';
    let tooltip = '';
    let suggest: TranslationSuggestValue<T>;
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
 * Component to render translation input with button to provide helper callout with i18n generation option.
 *
 * @param props Component properties.
 * @returns Component to render translation input.
 */
export const UITranslationInput = <T extends TranslationEntry = TranslationEntry>(
    props: UITranslationInputProps<T>
): ReactElement => {
    const {
        id,
        className,
        onChange,
        value,
        allowedPatterns,
        defaultPattern,
        entries,
        busy,
        i18nPrefix,
        allowedI18nPrefixes,
        namingConvention,
        onCreateNewEntry,
        onShowExistingEntry,
        disabled,
        strings
    } = props;

    const suggestion = getTranslationSuggestion(props);

    let classNames = ' ui-translatable__input';
    // Custom external classes
    if (className) {
        classNames += ` ${className}`;
    }

    const onUpdateValue = useCallback(
        (newValue: string): void => {
            onChange?.({} as React.FormEvent<HTMLInputElement>, newValue);
        },
        [onChange]
    );
    // Generate DOM id for i18n button
    let buttonId = `${id}-i18n`;
    let title = props.title;
    if (suggestion.suggest?.type === SuggestValueType.Existing && strings?.i18nEntryExistsInputTooltip) {
        // Change DOM id with additional suffix
        buttonId += '-navigate';
        if (!title) {
            title = formatText(strings.i18nEntryExistsInputTooltip, {
                value: value || '',
                translation: suggestion.suggest.entry.value.value
            });
        }
    }

    const onRenderSuffix = useCallback((): JSX.Element | null => {
        return (
            <UITranslationButton
                id={buttonId}
                value={value}
                busy={busy}
                onCreateNewEntry={onCreateNewEntry}
                onShowExistingEntry={onShowExistingEntry}
                onUpdateValue={onUpdateValue}
                disabled={disabled}
                strings={strings}
                suggestion={suggestion}
            />
        );
    }, [
        value,
        allowedPatterns,
        defaultPattern,
        entries,
        busy,
        disabled,
        i18nPrefix,
        allowedI18nPrefixes,
        namingConvention,
        onCreateNewEntry,
        onShowExistingEntry,
        onUpdateValue
    ]);

    const onRenderInput = useCallback(
        (
            props?: React.InputHTMLAttributes<HTMLInputElement> & React.RefAttributes<HTMLInputElement>,
            defaultRender?: (
                props?: React.InputHTMLAttributes<HTMLInputElement> & React.RefAttributes<HTMLInputElement>
            ) => JSX.Element | null
        ): JSX.Element | null => {
            if (defaultRender) {
                return (
                    <div className="ui-translatable__field" title={title}>
                        {defaultRender({ ...props, title: undefined })}
                    </div>
                );
            }
            return null;
        },
        [title]
    );

    return (
        <UITextInput
            {...props}
            onRenderSuffix={value?.trim() ? onRenderSuffix : undefined}
            className={classNames}
            onRenderInput={onRenderInput}
        />
    );
};

UITranslationInput.defaultProps = {
    strings: defaultTranslationInputStrings
};
