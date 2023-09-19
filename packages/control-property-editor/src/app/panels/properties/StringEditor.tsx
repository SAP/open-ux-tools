import type { ReactElement } from 'react';
import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import type { UITextInputProps } from '@sap-ux/ui-components';
import { UITextInput } from '@sap-ux/ui-components';

import { changeProperty } from '../../slice';

import type { PropertyInputProps } from './types';
import { isExpression, InputType } from './types';
import { setCachedValue } from './propertyValuesCache';

import './Properties.scss';
import {
    reportTelemetry,
    debounce,
    FLOAT_VALUE_TYPE,
    INTEGER_VALUE_TYPE,
    BOOLEAN_VALUE_TYPE
} from '@sap-ux-private/control-property-editor-common';
import './SapUiIcon.scss';
import { IconValueHelp } from './IconValueHelp';
import type { IconDetails } from '@sap-ux-private/control-property-editor-common';
import type { RootState } from '../../store';

/**
 * React element for string editor in property panel.
 *
 * @param propertyInputProps PropertyInputProps
 * @returns ReactElement
 */
export function StringEditor(propertyInputProps: PropertyInputProps): ReactElement {
    const {
        property: { name, value, isEnabled, isIcon, type, errorMessage },
        controlId,
        controlName
    } = propertyInputProps;
    const [val, setValue] = useState(value);
    const icons = useSelector<RootState, IconDetails[]>((state) => state.icons);

    useEffect(() => {
        setValue(value);
    }, [value]);

    const getValueHelpButton = (): React.ReactElement => {
        return (
            <IconValueHelp
                disabled={!isEnabled}
                icons={icons ?? []}
                isIcon={isIcon}
                value={value as string}
                controlId={controlId}
                propertyName={name}
            />
        );
    };
    const dispatch = useDispatch();
    const dispatchWithDelay = useRef(debounce(dispatch, 500));

    const inputProps: UITextInputProps = {};

    inputProps.onBlur = (e) => {
        reportTelemetry({ category: 'Property Change', propertyName: name }).catch((error) => {
            console.error(`Error in reporting telemetry`, error);
        });

        if (type === FLOAT_VALUE_TYPE && !isExpression(val)) {
            let newValue: string | number = String(e.target.value);
            if (type === FLOAT_VALUE_TYPE && !isExpression(newValue)) {
                newValue = parseFloat(String(newValue?.trim()));
            }
            setCachedValue(controlId, name, InputType.number, newValue);
            const action = changeProperty({ controlId, propertyName: name, value: newValue, controlName });
            dispatch(action);
            setValue(newValue);
        }
    };

    if (isIcon && !isExpression(val)) {
        inputProps.onRenderSuffix = getValueHelpButton;
    }

    return (
        <>
            <UITextInput
                className={`stringEditor icon-textField`}
                key={name}
                data-testid={`${name}--StringEditor`}
                disabled={!isEnabled}
                errorMessage={errorMessage}
                value={val as string}
                onChange={(
                    event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>,
                    newValue: string | undefined
                ): void => {
                    let value: string | number = String(newValue ?? '');
                    if (type === FLOAT_VALUE_TYPE && !isExpression(value)) {
                        const index = value.search(/\./) + 1;
                        const result = value.substring(0, index) + value.slice(index).replace(/\./g, '');
                        value = result.trim().replace(/(^-)|[^0-9.]+/g, '$1');
                    } else {
                        if (type === INTEGER_VALUE_TYPE && !isExpression(value)) {
                            value = value.trim().replace(/(^-)|(\D+)/g, '$1');
                            value = parseInt(String(value), 10);
                        }
                        const inputType = type === INTEGER_VALUE_TYPE ? InputType.number : InputType.string;
                        setCachedValue(controlId, name, inputType, value);
                        const action = changeProperty({ controlId, propertyName: name, value: value, controlName });
                        // starting from ui5 version 1.106, empty string "" is not accepted as change for boolean type properties
                        if (value || type !== BOOLEAN_VALUE_TYPE) {
                            // allow empty string "" when we have string type property
                            dispatchWithDelay.current(action);
                        }
                    }
                    setValue(value);
                }}
                {...inputProps}
            />
        </>
    );
}
