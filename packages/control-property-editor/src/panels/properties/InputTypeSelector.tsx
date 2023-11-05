import type { ReactElement } from 'react';
import React from 'react';
import { InputTypeToggle } from './InputTypeToggle';
import type { InputTypeWrapperProps } from './types';

/**
 * Input type selector.
 *
 * @param props InputTypeWrapperProps
 * @returns ReactElement
 */
export function InputTypeSelector(props: InputTypeWrapperProps): ReactElement {
    return (
        <>
            {props.toggleOptions.map((optionProps) => (
                <InputTypeToggle key={optionProps.inputType} inputTypeProps={optionProps} {...props} />
            ))}
        </>
    );
}
