import React from 'react';
import type { InputQuestion } from 'inquirer';
import { UITextInput } from '@sap-ux/ui-components';

export type InputProps = InputQuestion;

export const Input = () => {
    return <UITextInput />;
};
