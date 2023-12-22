import React from 'react';
import type { CheckboxQuestion } from 'inquirer';
import { UICheckbox } from '@sap-ux/ui-components';
import { useValue } from '../../utilities';

export interface CheckboxProps extends CheckboxQuestion {
    value?: boolean;
    onChange: (name: string, value?: boolean) => void;
}

export const Checkbox = (props: CheckboxProps) => {
    const { name = '', onChange } = props;
    const [value, setValue] = useValue(false, props.value);
    const onToggle = (event?: React.FormEvent, checked = false) => {
        setValue(checked);
        onChange(name, checked);
    };
    return <UICheckbox label={name} checked={value} onChange={onToggle} />;
};
