import React from 'react';
import type { InputQuestion } from 'inquirer';
import { UITextInput } from '@sap-ux/ui-components';

export type InputProps = InputQuestion;

export const Input = (props: InputProps) => {
    const { name } = props;
    return <UITextInput label={name} />;
};
