import React, { useEffect, useMemo } from 'react';
import type { ChoiceOptions, Answers } from 'inquirer';
import { UIComboBox, UIComboBoxLoaderType, UITextInput } from '@sap-ux/ui-components';
import type { ITextField, UIComboBoxRef, UISelectableOption } from '@sap-ux/ui-components';
import { useValue, getLabelRenderer, useOptions, usePromptMessage, useUISeverityMessage } from '../../../utilities';
import type { AnswerValue, ListPromptQuestion, PromptListChoices } from '../../../types';
import { useState } from 'react';

export interface SelectProps extends ListPromptQuestion {
    id?: string;
    value?: AnswerValue;
    onChange: (name: string, value: AnswerValue) => void;
    dynamicChoices?: PromptListChoices;
    pending?: boolean;
    errorMessage?: string;
    answers?: Answers;
}

export const Select = (props: SelectProps) => {
    const { name, message, onChange, guiOptions = {}, pending, errorMessage, dynamicChoices, id, answers, additionalMessages } = props;
    const { mandatory, hint, placeholder, creation } = guiOptions;
    const [value, setValue] = useValue('', props.value ?? '');
    const inputRef = React.createRef<ITextField>();
    const options = useOptions(props, dynamicChoices);
    const [uiSeverityMessage, setUiSeverityMessage] = useState({});

    const defaultValue = useMemo(() => {
        // Single option - auto-select
        if (options.length === 1) {
            return options[0].data?.value;
        }

        // Use the first checked option as default
        const checkedOption = options.find((opt) => opt.data && 'checked' in opt.data && opt.data.checked === true);
        if (checkedOption) {
            return checkedOption.data?.value;
        }

        // do not preselect any value by default
        return undefined;
    }, [options]);

    const resolvedMessage = usePromptMessage(message, answers);
    const label = resolvedMessage?.trim() ? resolvedMessage : name;
    
    useEffect(() => {
        if (additionalMessages) {
            useUISeverityMessage(props, options, setUiSeverityMessage); //todo: revist
        }
    }, [answers, additionalMessages, dynamicChoices, options]);

    useEffect(() => {
        if (defaultValue !== undefined && value !== defaultValue) {
            setValue(defaultValue);
            onChange(name, defaultValue);
        }
    }, [defaultValue]);

    const onChangeSelect = (
        event?: React.FormEvent<HTMLSelectElement | UIComboBoxRef>,
        option?: UISelectableOption<ChoiceOptions>
    ) => {
        let updatedValue: string | undefined;
        if (creation && !option) {
            const enteredValue = (event?.target as HTMLSelectElement).value ?? '';
            setValue(enteredValue);
            updatedValue = enteredValue;
        } else if (option) {
            setValue(option.key);
            updatedValue = option.data?.value;
        } else if ((event?.target as HTMLSelectElement).value === '') {
            setValue('');
            updatedValue = '';
        }
        if (updatedValue !== undefined) {
            onChange(name, updatedValue);
        }
    };

    const onChangeTextInput = (event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string) => {
        if (newValue !== undefined) {
            setValue(newValue);
            onChange(name, newValue);
        }
    };

    const isTextField = creation && !options?.length && !pending; // show loader in comboBox

    const component = isTextField ? (
        <UITextInput
            componentRef={inputRef}
            label={label}
            value={value?.toString()}
            placeholder={creation.placeholder}
            errorMessage={errorMessage}
            required={mandatory}
            onChange={onChangeTextInput}
            onRenderLabel={getLabelRenderer(hint)}
            id={id}
            {...uiSeverityMessage && uiSeverityMessage}
        />
    ) : (
        <UIComboBox
            label={label}
            options={options}
            highlight={true}
            allowFreeform={true}
            useComboBoxAsMenuMinWidth={true}
            autoComplete="on"
            required={mandatory}
            isLoading={pending ? [UIComboBoxLoaderType.Input, UIComboBoxLoaderType.List] : undefined}
            selectedKey={value?.toString()}
            disabled={false}
            text={creation ? value?.toString() : undefined}
            onChange={onChangeSelect}
            onRenderLabel={getLabelRenderer(hint)}
            errorMessage={errorMessage}
            placeholder={placeholder}
            id={id}
            {...uiSeverityMessage && uiSeverityMessage}
        />
    );
    return <>
        {component}
    </>;
};
