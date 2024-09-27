import { UIIconButton } from '@sap-ux/ui-components';
import type { ReactElement } from 'react';
import React from 'react';
import { useDispatch } from 'react-redux';
import type { ControlProperty, StringControlPropertyWithOptions } from '@sap-ux-private/control-property-editor-common';
import { changeProperty } from '../../slice';
import type { CacheValue } from './propertyValuesCache';
import { getCachedValue } from './propertyValuesCache';
import styles from './InputTypeToggle.module.scss';
import type { InputTypeToggleProps } from './types';
import { InputType } from './types';
import { reportTelemetry, STRING_VALUE_TYPE } from '@sap-ux-private/control-property-editor-common';

/**
 * Get value for input type.
 *
 * @param controlId string
 * @param property ControlProperty
 * @param inputType InputType
 * @returns CacheValue
 */
export function getValueForInputType(controlId: string, property: ControlProperty, inputType: InputType): CacheValue {
    if (inputType === InputType.booleanTrue) {
        return true;
    } else if (inputType === InputType.booleanFalse) {
        return false;
    } else {
        const cachedValue = getCachedValue(controlId, property.name, inputType);
        if (cachedValue) {
            return cachedValue;
        } else if (inputType === InputType.expression) {
            return '{expression}';
        } else if (inputType === InputType.enumMember) {
            return (property as StringControlPropertyWithOptions).options[0]?.key ?? '';
        } else {
            return property.type === STRING_VALUE_TYPE ? '' : 0;
        }
    }
}

/**
 * React element for input type toggle.
 *
 * @param inputTypeToggleProps InputTypeToggleProps
 * @returns ReactElement
 */
export function InputTypeToggle(inputTypeToggleProps: InputTypeToggleProps): ReactElement {
    const { inputTypeProps, controlId, property, controlName } = inputTypeToggleProps;
    const { tooltip, iconName, selected } = inputTypeProps;
    const dispatch = useDispatch();
    return (
        <UIIconButton
            className={selected ? styles.selectedTypeButton : ''}
            data-testid={`${property.name}--InputTypeToggle--${inputTypeProps.inputType}`}
            iconProps={{ iconName: iconName }}
            title={tooltip}
            disabled={!property.isEnabled}
            toggle={true}
            checked={selected}
            style={{ margin: 1, padding: 1 }}
            onClick={(): void => {
                if (inputTypeProps.selected) {
                    return;
                } // click on already selected button should have no effect
                const newValue = getValueForInputType(controlId, property, inputTypeProps.inputType);
                reportTelemetry({ category: 'Property Change', propertyName: property.name }).catch((error) => {
                    console.error(`Error in reporting telemetry`, error);
                });
                const action = changeProperty({
                    changeType:
                        inputTypeProps.inputType !== InputType.expression ? 'propertyChange' : 'propertyBindingChange',
                    controlId,
                    propertyName: property.name,
                    value: newValue,
                    controlName
                });
                dispatch(action);
            }}
        />
    );
}
