import type { ReactElement } from 'react';
import React from 'react';
import { useDispatch } from 'react-redux';

import type { UIComboBoxOption, UIComboBoxRef } from '@sap-ux/ui-components';
import { UIComboBox } from '@sap-ux/ui-components';

import type { PropertyChange, StringControlPropertyWithOptions } from '../../../api';
import { changeProperty } from '../../slice';

import { setCachedValue } from './propertyValuesCache';
import type { PropertyInputProps } from './types';
import { InputType } from './types';

import './Properties.scss';
import { reportTelemetry } from '../../../telemetry';
import { debounce } from '../../../debounce';

// exported to make it testable without events
export const valueChanged = (
    controlId: string,
    name: string,
    newValue: string | number,
    controlName: string
): { payload: PropertyChange<string | number | boolean>; type: string } => {
    setCachedValue(controlId, name, InputType.enumMember, newValue);
    return changeProperty({ controlId, propertyName: name, value: newValue, controlName });
};

/**
 * React element for dropdown editor.
 *
 * @param propertyInputProps
 * @returns {ReactElement}
 */
export function DropdownEditor(propertyInputProps: PropertyInputProps<StringControlPropertyWithOptions>): ReactElement {
    const {
        property: { name, value, options, isEnabled, errorMessage },
        controlId,
        controlName
    } = propertyInputProps;
    const dispatch = useDispatch();
    const selectedOption = options.find((enumValue) => enumValue.key === value);
    const text = !selectedOption && value ? value : undefined;

    return (
        <UIComboBox
            className="dropdownEditor"
            key={name}
            data-testid={`${name}--DropdownEditor`}
            selectedKey={value}
            disabled={!isEnabled}
            autoComplete="on"
            allowFreeform={true}
            text={text}
            errorMessage={errorMessage}
            options={options}
            useComboBoxAsMenuWidth={true}
            onChange={(
                event: React.FormEvent<UIComboBoxRef>,
                option?: UIComboBoxOption,
                index?: number,
                value?: string
            ): void => {
                const newValue = option?.key ?? value ?? '';
                try {
                    reportTelemetry({ category: 'Property Change', propertyName: name });
                } catch (error) {
                    console.error(`Error in reporting telemetry`, error);
                } finally {
                    dispatch(valueChanged(controlId, name, newValue, controlName));
                }
            }}
            onPendingValueChanged={debounce((option?: UIComboBoxOption, index?: number, value?: string): void => {
                if (value) {
                    try {
                        reportTelemetry({ category: 'Property Change', propertyName: name });
                    } catch (error) {
                        console.error(`Error in reporting telemetry`, error);
                    } finally {
                        dispatch(valueChanged(controlId, name, value, controlName));
                    }
                }
            }, 500)}
        />
    );
}
