import React from 'react';
import type { CheckboxQuestion } from 'inquirer';
import { UICheckbox } from '@sap-ux/ui-components';

export type CheckboxProps = CheckboxQuestion;

export const Checkbox = (props: CheckboxProps) => {
    const { name } = props;
    return <UICheckbox label={name} />;
};
