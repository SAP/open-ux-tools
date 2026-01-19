import React from 'react';
import { UIComboBox, UIComboBoxLoaderType } from '@sap-ux/ui-components';
import { useValue, getLabelRenderer, useOptions, useDisplayText, useCheckedKeys } from '../../../utilities';
import type { AnswerValue, CheckboxPromptQuestion, PromptListChoices } from '../../../types';

export interface MultiSelectProps extends CheckboxPromptQuestion {
    id?: string;
    value?: AnswerValue;
    onChange: (name: string, value: AnswerValue) => void;
    dynamicChoices?: PromptListChoices;
    pending?: boolean;
    errorMessage?: string;
}

export const MultiSelect = (props: MultiSelectProps) => {
    const { name, message, onChange, guiOptions = {}, pending, errorMessage, dynamicChoices, id } = props;
    const { mandatory, hint, placeholder } = guiOptions;
    const [value, setValue] = useValue('', props.value?.toString() ?? '');
    const options = useOptions(props, dynamicChoices);

    const text = useDisplayText(options, value);
    const checkedOptions = useCheckedKeys(options);

    const handleSubmitValue = (value: string): string => {
        const currentSelectedOptions =
            value
                ?.split(',')
                .map((v) => v.trim())
                .filter(Boolean) ?? [];
        const allSelectedOptions = new Set([...currentSelectedOptions, ...checkedOptions]);
        return Array.from(allSelectedOptions).join(',');
    };

    // // Filter selectedKey to exclude checked options (to match what text displays)
    // const selectedKeys = useMemo(() => {
    //     if (!value) return [];
    //     const checkedSet = new Set(checkedOptions);
    //     return value
    //         .split(',')
    //         .map(v => v.trim())
    //         .filter(v => v && !checkedSet.has(v));
    // }, [value, checkedOptions]);

    return (
        <UIComboBox
            label={typeof message === 'string' ? message : name}
            options={options}
            highlight={true}
            allowFreeform={true}
            useComboBoxAsMenuMinWidth={true}
            autoComplete="on"
            required={mandatory}
            isLoading={pending ? [UIComboBoxLoaderType.Input, UIComboBoxLoaderType.List] : undefined}
            selectedKey={value?.split(',').map((v) => v.trim())}
            // selectedKey={selectedKeys}
            multiSelect
            disabled={false}
            text={text}
            calloutCollisionTransformation={true}
            onChange={(_, changedOption) => {
                let updatedValue: string | undefined = '';
                if (changedOption?.selected) {
                    updatedValue = [...(value?.split(',').filter((option) => option) ?? []), changedOption.key].join();
                } else {
                    updatedValue = (value?.split(',') ?? [])
                        .filter((option) => option && option !== changedOption?.key)
                        .join();
                }
                setValue(updatedValue);
                onChange(name, handleSubmitValue(updatedValue));
                // onChange(name, updatedValue);
            }}
            onRenderLabel={getLabelRenderer(hint)}
            errorMessage={errorMessage}
            placeholder={placeholder}
            id={id}
        />
    );
};
