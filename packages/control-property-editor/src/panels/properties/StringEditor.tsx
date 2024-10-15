import type { ReactElement } from 'react';
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import type { UITextInputProps } from '@sap-ux/ui-components';
import { UITextInput } from '@sap-ux/ui-components';

import { changeProperty } from '../../slice';

import type { PropertyInputProps } from './types';
import { isExpression, InputType } from './types';
import { setCachedValue } from './propertyValuesCache';

import './Properties.scss';
import { reportTelemetry, FLOAT_VALUE_TYPE, INTEGER_VALUE_TYPE } from '@sap-ux-private/control-property-editor-common';
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
                controlName={controlName}
                value={value as string}
                controlId={controlId}
                propertyName={name}
            />
        );
    };
    const dispatch = useDispatch();

    const handlеChange = (
        e:
            | React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>
            | React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
    ): void => {
        if (value?.toString() === e.currentTarget.value) {
            return;
        }
        reportTelemetry({ category: 'Property Change', propertyName: name }).catch((error) => {
            console.error(`Error in reporting telemetry`, error);
        });

        if (type === FLOAT_VALUE_TYPE && !isExpression(val)) {
            let newValue: string | number = String(e.currentTarget.value);
            if (type === FLOAT_VALUE_TYPE && !isExpression(newValue)) {
                newValue = parseFloat(String(newValue?.trim()));
            }
            setCachedValue(controlId, name, InputType.number, newValue);
            const action = changeProperty({
                changeType: 'propertyBindingChange',
                controlId,
                propertyName: name,
                value: newValue,
                controlName
            });
            dispatch(action);
            setValue(newValue);
        } else {
            const action = changeProperty({
                changeType: 'propertyChange',
                controlId,
                propertyName: name,
                value: val,
                controlName
            });
            dispatch(action);
        }
    };

    const inputProps: UITextInputProps = {};
    inputProps.onBlur = (e): void => handlеChange(e);

    inputProps.onKeyUp = (e): void => {
        if (e.key === 'Enter') {
            handlеChange(e);
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
                    }
                    setValue(value);
                }}
                {...inputProps}
            />
        </>
    );
}
