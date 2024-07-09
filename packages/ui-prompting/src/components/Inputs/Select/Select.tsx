import React from 'react';
import type { ChoiceOptions, ListQuestion } from 'inquirer';
import { UIComboBox, UIComboBoxLoaderType, UITextInput } from '@sap-ux/ui-components';
import type { ITextField, UIComboBoxRef, UISelectableOption } from '@sap-ux/ui-components';
import { useValue, getLabelRenderer } from '../../../utilities';
import type { ListPromptQuestionCreationProps } from '../../../types';

export interface SelectProps extends ListQuestion {
    name: string;
    value?: string | number | boolean;
    onChange: (name: string, value: string | number | undefined) => void;
    creation?: ListPromptQuestionCreationProps;
    required?: boolean;
    options: UISelectableOption<ChoiceOptions>[];
    pending?: boolean;
    additionalInfo?: string;
    errorMessage?: string;
    placeholder?: string;
}

export const Select = (props: SelectProps) => {
    const { name, message, onChange, required, options, pending, additionalInfo, errorMessage, placeholder, creation } =
        props;
    const [value, setValue] = useValue('', props.value);
    const inputRef = React.createRef<ITextField>();

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
