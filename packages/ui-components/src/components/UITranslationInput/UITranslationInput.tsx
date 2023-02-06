import React, { useCallback } from 'react';
import type { ReactElement } from 'react';
import { UITextInput } from '../UIInput';
import type { ITextFieldProps } from '../UIInput';
import { UITranslationButton } from './UITranslationButton';
import type { UITranslationButtonProps } from './UITranslationButton.types';

export interface UITranslationInputProps extends ITextFieldProps, UITranslationButtonProps {
    id: string;
    dummy?: string;
}

/**
 * Component to render translation input with button to provide helper callout with i18n generation option.
 *
 * @param props Component properties.
 * @returns Component to render translation input.
 */
export function UITranslationInput(props: UITranslationInputProps): ReactElement {
    const {
        title,
        id,
        className,
        onChange,
        value,
        allowedPatterns,
        defaultPattern,
        entries,
        busy,
        i18nPrefix,
        namingConvention,
        onCreateNewEntry,
        onShowExistingEntry
    } = props;

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

    const onRenderSuffix = useCallback((): JSX.Element | null => {
        return (
            <UITranslationButton
                id={`${id}-i18n`}
                value={value}
                allowedPatterns={allowedPatterns}
                defaultPattern={defaultPattern}
                entries={entries}
                busy={busy}
                i18nPrefix={i18nPrefix}
                namingConvention={namingConvention}
                onCreateNewEntry={onCreateNewEntry}
                onShowExistingEntry={onShowExistingEntry}
                onUpdateValue={onUpdateValue}
            />
        );
    }, [
        value,
        allowedPatterns,
        defaultPattern,
        entries,
        busy,
        i18nPrefix,
        namingConvention,
        onCreateNewEntry,
        onShowExistingEntry,
        onUpdateValue
    ]);

    return (
        <UITextInput
            {...props}
            title={title}
            onRenderSuffix={value?.trim() ? onRenderSuffix : undefined}
            className={classNames}
        />
    );
}
