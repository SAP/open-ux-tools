import React from 'react';
import type { ListQuestion } from 'inquirer';
import { UITextInput } from '@sap-ux/ui-components';

export type SelectProps = ListQuestion;

export const Select = (props: SelectProps) => {
    const { name } = props;
    return <UITextInput label={name} />;
};
