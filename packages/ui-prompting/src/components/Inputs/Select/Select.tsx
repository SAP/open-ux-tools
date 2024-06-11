import React from 'react';
import type { ListQuestion } from 'inquirer';
import { UIComboBox, UIComboBoxLoaderType, UITextInput } from '@sap-ux/ui-components';
import type { ITextField, UIComboBoxOption, UIComboBoxRef } from '@sap-ux/ui-components';
import { useValue, getLabelRenderer } from '../../../utilities';

export interface SelectProps extends ListQuestion {
    value?: string | number | boolean;
    onChange: (name: string, value: string | number | undefined, dependantPromptNames?: string[]) => void;
    dependantPromptNames?: string[];
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
        dependantPromptNames,
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

    const onChangeCreateSelect = (
        event?: React.FormEvent<HTMLDivElement | UIComboBoxRef>,
        option?: UIComboBoxOption,
        index?: number,
        comboboxValue?: string
    ) => {
        const newOption = comboboxValue === undefined ? undefined : { key: comboboxValue, text: comboboxValue };
        setValue(option ? option.key ?? '' : (newOption?.text as string));
        if (name) {
            // ToDo - avoid any? -> option?.data.value
            onChange(name, option ? option.data.value : newOption?.text, dependantPromptNames);
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
            onChange={(_, newValue) => {
                if (newValue !== undefined) {
                    setValue(newValue);
                    if (name) {
                        onChange(name, newValue, dependantPromptNames);
                    }
                }
            }}
            onRenderLabel={getLabelRenderer(additionalInfo)}
            onClick={handleOnClick}
        />
    ) : (
        <UIComboBox
            label={typeof message === 'string' ? message : name}
            options={options.sort((a, b) => a.text.localeCompare(b.text))}
            highlight={true}
            allowFreeform={true}
            useComboBoxAsMenuMinWidth={true}
            autoComplete="on"
            required={required}
            isLoading={pending ? [UIComboBoxLoaderType.Input, UIComboBoxLoaderType.List] : undefined}
            selectedKey={value.toString()}
            disabled={false}
            text={allowCreate ? value.toString() : undefined}
            onChange={
                allowCreate
                    ? onChangeCreateSelect
                    : (_, option) => {
                          setValue(option?.key ?? '');
                          if (name) {
                              // ToDo - avoid any? -> option?.data.value
                              onChange(name, option?.data.value, dependantPromptNames);
                          }
                      }
            }
            onRenderLabel={getLabelRenderer(additionalInfo)}
            errorMessage={errorMessage}
            placeholder={placeholder}
        />
    );
    return <>{component}</>;
};
