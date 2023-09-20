import type { ReactElement } from 'react';

import type {
    ControlProperty,
    CHECKBOX_EDITOR_TYPE,
    DROPDOWN_EDITOR_TYPE,
    INPUT_EDITOR_TYPE
} from '@sap-ux-private/control-property-editor-common';

import type { PropertyChangeStats } from '../../slice';

export interface PropertyInputProps<T extends ControlProperty = ControlProperty> {
    controlId: string;
    controlName: string;
    property: T;
    changes?: PropertyChangeStats;
}

export const enum InputType {
    booleanTrue = 'booleanTrue',
    booleanFalse = 'booleanFalse',
    enumMember = 'enumMember',
    string = 'string',
    number = 'number',
    expression = 'expression'
}

export interface InputTypeToggleOptionProps {
    inputType: InputType;
    tooltip: string;
    iconName: string;
    selected?: boolean;
}

export type InputTypeWrapperProps = PropertyInputProps & {
    toggleOptions: InputTypeToggleOptionProps[];
    children?: ReactElement;
};

export type InputTypeToggleProps = InputTypeWrapperProps & {
    key: string;
    inputTypeProps: InputTypeToggleOptionProps;
};

export type Editor = typeof INPUT_EDITOR_TYPE | typeof DROPDOWN_EDITOR_TYPE | typeof CHECKBOX_EDITOR_TYPE;

export const isExpression = (value: string | boolean | number): boolean => {
    return typeof value === 'string' && value.includes('{') && value.includes('}');
};
