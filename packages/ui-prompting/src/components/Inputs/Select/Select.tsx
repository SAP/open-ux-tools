import React, { useEffect } from 'react';
import type { ChoiceOptions } from 'inquirer';
import { UIComboBox, UIComboBoxLoaderType, UITextInput } from '@sap-ux/ui-components';
import type { ITextField, UIComboBoxRef, UISelectableOption } from '@sap-ux/ui-components';
import { useValue, getLabelRenderer, useOptions } from '../../../utilities';
import type { AnswerValue, ListPromptQuestion, PromptListChoices } from '../../../types';

export interface SelectProps extends ListPromptQuestion {
    id?: string;
    value?: AnswerValue;
    onChange: (name: string, value: AnswerValue) => void;
    dynamicChoices?: PromptListChoices;
    pending?: boolean;
    errorMessage?: string;
}

export const Select = (props: SelectProps) => {
    const { name, message, onChange, guiOptions = {}, pending, errorMessage, dynamicChoices, id } = props;
    const { mandatory, hint, placeholder, creation } = guiOptions;
    const [value, setValue] = useValue('', props.value ?? '');
    const inputRef = React.createRef<ITextField>();
    const options = useOptions(props, dynamicChoices);
    const defaultValue = options.length === 1 ? options[0].data?.value : undefined;
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
            label={typeof message === 'string' ? message : name}
            value={value?.toString()}
            placeholder={creation.placeholder}
            errorMessage={errorMessage}
            required={mandatory}
            onChange={onChangeTextInput}
            onRenderLabel={getLabelRenderer(hint)}
            id={id}
        />
    ) : (
        <UIComboBox
            label={typeof message === 'string' ? message : name}
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
        />
    );
    return <>{component}</>;
};
