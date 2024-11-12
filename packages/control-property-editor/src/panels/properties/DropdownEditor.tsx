import type { ReactElement } from 'react';
import React from 'react';
import { useDispatch } from 'react-redux';

import type { UIComboBoxOption, UIComboBoxRef } from '@sap-ux/ui-components';
import { UIComboBox } from '@sap-ux/ui-components';

import type {
    PropertyChange,
    PropertyType,
    StringControlPropertyWithOptions
} from '@sap-ux-private/control-property-editor-common';
import { changeProperty } from '../../slice';

import { setCachedValue } from './propertyValuesCache';
import type { PropertyInputProps } from './types';
import { InputType } from './types';

import './Properties.scss';
import { debounce, reportTelemetry } from '@sap-ux-private/control-property-editor-common';

// exported to make it testable without events
export const valueChanged = (
    controlId: string,
    name: string,
    newValue: string | number,
    controlName: string,
    propertyType: PropertyType
): { payload: PropertyChange<string | number | boolean>; type: string } => {
    setCachedValue(controlId, name, InputType.enumMember, newValue);
    return changeProperty({
        changeType: 'propertyChange',
        controlId,
        propertyName: name,
        value: newValue,
        controlName,
        propertyType
    });
};

/**
 * React element for dropdown editor.
 *
 * @param propertyInputProps PropertyInputProps<StringControlPropertyWithOptions>
 * @returns ReactElement
 */
export function DropdownEditor(propertyInputProps: PropertyInputProps<StringControlPropertyWithOptions>): ReactElement {
    const {
        property: { name, value, options, isEnabled, errorMessage, propertyType },
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
            allowFreeform={false}
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
                reportTelemetry({ category: 'Property Change', propertyName: name }).catch((error) => {
                    console.error(`Error in reporting telemetry`, error);
                });
                dispatch(valueChanged(controlId, name, newValue, controlName, propertyType));
            }}
            onPendingValueChanged={debounce((option?: UIComboBoxOption, index?: number, value?: string): void => {
                if (value) {
                    reportTelemetry({ category: 'Property Change', propertyName: name }).catch((error) => {
                        console.error(`Error in reporting telemetry`, error);
                    });
                    dispatch(valueChanged(controlId, name, value, controlName, propertyType));
                }
            }, 500)}
        />
    );
}
