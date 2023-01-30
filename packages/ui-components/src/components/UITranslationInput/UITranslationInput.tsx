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

export function UITranslationInput(props: UITranslationInputProps): ReactElement {
    const { title, id, className, onChange } = props;

    let classNames = ' ui-translatable__input';
    // Custom external classes
    if (className) {
        classNames += ` ${className}`;
    }

    const onUpdateValue = useCallback((newValue: string): void => {
        // ToDo - event???
        onChange?.({} as any, newValue);
    }, []);

    const onRenderSuffix = (): JSX.Element | null => {
        return (
            <UITranslationButton
                id={`${id}-i18n`}
                value={props.value}
                allowedPatterns={props.allowedPatterns}
                defaultPattern={props.defaultPattern}
                entries={props.entries}
                busy={props.busy}
                i18nPrefix={props.i18nPrefix}
                namingConvention={props.namingConvention}
                onCreateNewEntry={props.onCreateNewEntry}
                onShowExistingEntry={props.onShowExistingEntry}
                onUpdateValue={onUpdateValue}
            />
        );
    };

    return <UITextInput {...props} title={title} onRenderSuffix={onRenderSuffix} className={classNames} />;
}
