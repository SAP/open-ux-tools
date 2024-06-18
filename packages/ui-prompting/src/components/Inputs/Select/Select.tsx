import React from 'react';
import type { ListQuestion } from 'inquirer';
import { UIComboBox, UIComboBoxLoaderType, UITextInput } from '@sap-ux/ui-components';
import type { ITextField, UIComboBoxOption, UIComboBoxRef } from '@sap-ux/ui-components';
import { useValue, getLabelRenderer } from '../../../utilities';

export interface SelectProps extends ListQuestion {
    value?: string | number | boolean;
    onChange: (name: string, value: string | number | undefined) => void;

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
        placeholder
    } = props;
    const [value, setValue] = useValue('', props.value);
    const inputRef = React.createRef<ITextField>();
    const allowCreate = name === 'filterBarId';

    const onChangeSelect = (
        event?: React.FormEvent<HTMLDivElement | UIComboBoxRef>,
        option?: UIComboBoxOption,
        index?: number,
        comboboxValue?: string
    ) => {
        let updatedValue;
        if (allowCreate) {
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

    const isTextField = allowCreate && (!options || !options.length);
    const handleOnClick = () => {
        inputRef?.current?.focus();
    };

    const component = isTextField ? (
        <UITextInput
            componentRef={inputRef}
            label={typeof message === 'string' ? message : name}
            value={value.toString()}
            placeholder={'Enter a new ID'}
            errorMessage={errorMessage}
            required={props.required}
            onChange={onChangeTextInput}
            onRenderLabel={getLabelRenderer(additionalInfo)}
            onClick={handleOnClick}
        />
    ) : (
        <UIComboBox
            label={typeof message === 'string' ? message : name}
            options={options?.sort((a, b) => a.text.localeCompare(b.text))}
            highlight={true}
            allowFreeform={true}
            useComboBoxAsMenuMinWidth={true}
            autoComplete="on"
            required={required}
            isLoading={pending ? [UIComboBoxLoaderType.Input, UIComboBoxLoaderType.List] : undefined}
            selectedKey={value.toString()}
            disabled={false}
            text={allowCreate ? value.toString() : undefined}
            onChange={onChangeSelect}
            onRenderLabel={getLabelRenderer(additionalInfo)}
            errorMessage={errorMessage}
            placeholder={placeholder}
        />
    );
    return <>{component}</>;
};
