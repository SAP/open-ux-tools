import React from 'react';
import type { ListQuestion } from 'inquirer';
import { UIComboBox, UIComboBoxLoaderType, UITextInput } from '@sap-ux/ui-components';
import type { ITextField, UIComboBoxOption, UIComboBoxRef } from '@sap-ux/ui-components';
import { useValue, getLabelRenderer } from '../../../utilities';
import { ListPromptQuestionCreationProps } from '../../../types';

export interface SelectProps extends ListQuestion {
    value?: string | number | boolean;
    onChange: (name: string, value: string | number | undefined) => void;
    creation?: ListPromptQuestionCreationProps;
    required?: boolean;
    options: UIComboBoxOption[];
    pending?: boolean;
    additionalInfo?: string;
    errorMessage?: string;
    placeholder?: string;
}

export const Select = (props: SelectProps) => {
    const {
        name = '',
        message,
        onChange,
        required,
        options,
        pending,
        additionalInfo,
        errorMessage,
        placeholder,
        creation
    } = props;
    const [value, setValue] = useValue('', props.value);
    const inputRef = React.createRef<ITextField>();

    const onChangeSelect = (
        event?: React.FormEvent<HTMLDivElement | UIComboBoxRef>,
        option?: UIComboBoxOption,
        index?: number,
        comboboxValue?: string
    ) => {
        let updatedValue;
        if (creation) {
            const newOption = comboboxValue === undefined ? undefined : { key: comboboxValue, text: comboboxValue };
            setValue(option ? option.key ?? '' : (newOption?.text as string));
            updatedValue = option ? option.data.value : newOption?.text;
        } else {
            setValue(option?.key ?? '');
            updatedValue = option?.data?.value;
        }
        if (name) {
            onChange(name, updatedValue);
        }
    };

    const onChangeTextInput = (event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string) => {
        if (newValue !== undefined) {
            setValue(newValue);
            if (name) {
                onChange(name, newValue);
            }
        }
    };

    const isTextField = creation && (!options || !options.length);

    const component = isTextField ? (
        <UITextInput
            componentRef={inputRef}
            label={typeof message === 'string' ? message : name}
            value={value.toString()}
            placeholder={creation.inputPlaceholder}
            errorMessage={errorMessage}
            required={props.required}
            onChange={onChangeTextInput}
            onRenderLabel={getLabelRenderer(additionalInfo)}
        />
    ) : (
        <UIComboBox
            label={typeof message === 'string' ? message : name}
            options={options}
            highlight={true}
            allowFreeform={true}
            useComboBoxAsMenuMinWidth={true}
            autoComplete="on"
            required={required}
            isLoading={pending ? [UIComboBoxLoaderType.Input, UIComboBoxLoaderType.List] : undefined}
            selectedKey={value.toString()}
            disabled={false}
            text={creation ? value.toString() : undefined}
            onChange={onChangeSelect}
            onRenderLabel={getLabelRenderer(additionalInfo)}
            errorMessage={errorMessage}
            placeholder={placeholder}
        />
    );
    return <>{component}</>;
};
