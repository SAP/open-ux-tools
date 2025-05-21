import { cleanup, fireEvent, screen } from '@testing-library/react';
import React from 'react';
import type {
    BooleanControlProperty,
    StringControlProperty,
    StringControlPropertyWithOptions
} from '@sap-ux-private/control-property-editor-common';
import {
    BOOLEAN_VALUE_TYPE,
    CHECKBOX_EDITOR_TYPE,
    DROPDOWN_EDITOR_TYPE,
    INPUT_EDITOR_TYPE,
    PropertyType,
    STRING_VALUE_TYPE
} from '@sap-ux-private/control-property-editor-common';
import { IconName } from '../../../../src/icons';
import { getValueForInputType, InputTypeToggle } from '../../../../src/panels/properties/InputTypeToggle';
import type { InputTypeToggleOptionProps } from '../../../../src/panels/properties/types';
import { InputType } from '../../../../src/panels/properties/types';
import { render } from '../../utils';
import * as slice from '../../../../src/slice';

describe('InputTypeToggle', () => {
    const controlId = 'testControlId';

    test('getValueForInputType', () => {
        // Checkbox with value true, press on false and expression
        const propCheckbox: BooleanControlProperty = {
            editor: CHECKBOX_EDITOR_TYPE,
            type: BOOLEAN_VALUE_TYPE,
            value: true,
            isEnabled: false,
            name: 'testPropNameCheckbox',
            readableName: 'testName',
            propertyType: PropertyType.ControlProperty
        };

        let value = getValueForInputType(controlId, { ...propCheckbox }, InputType.booleanFalse);
        expect(value).toMatchInlineSnapshot(`false`);

        value = getValueForInputType(controlId, { ...propCheckbox }, InputType.expression);
        expect(value).toMatchInlineSnapshot(`"{expression}"`);

        // Dropdown Box
        const propDropDown: StringControlPropertyWithOptions = {
            editor: DROPDOWN_EDITOR_TYPE,
            type: STRING_VALUE_TYPE,
            value: 'option2',
            isEnabled: true,
            name: 'testPropNameDropDown',
            options: [
                { key: 'option1', text: 'option1' },
                { key: 'option2', text: 'option2' }
            ],
            readableName: 'testName',
            propertyType: PropertyType.ControlProperty
        };

        value = getValueForInputType(controlId, { ...propDropDown }, InputType.expression);
        expect(value).toMatchInlineSnapshot(`"{expression}"`);

        value = getValueForInputType(controlId, { ...propDropDown, value: '{expr}' }, InputType.enumMember);
        expect(value).toMatchInlineSnapshot(`"option1"`);

        // String Input
        const propString: StringControlProperty = {
            editor: INPUT_EDITOR_TYPE,
            type: STRING_VALUE_TYPE,
            value: 'myString',
            isEnabled: true,
            name: 'testPropNameString',
            readableName: 'testName',
            propertyType: PropertyType.ControlProperty
        };

        value = getValueForInputType(controlId, { ...propString }, InputType.expression);
        expect(value).toMatchInlineSnapshot(`"{expression}"`);

        value = getValueForInputType(controlId, { ...propString, value: '{expr}' }, InputType.string);
        expect(value).toMatchInlineSnapshot(`""`);
    });

    test('render & click (for boolean value)', () => {
        // arrange
        const propertyName = 'testProperty';
        const value = false;
        const property: BooleanControlProperty = {
            type: BOOLEAN_VALUE_TYPE,
            editor: CHECKBOX_EDITOR_TYPE,
            isEnabled: true,
            name: propertyName,
            value,
            readableName: 'testName',
            propertyType: PropertyType.ControlProperty
        };
        const inputTypeProps: InputTypeToggleOptionProps = {
            inputType: InputType.booleanTrue,
            tooltip: 'DummyTooltip',
            iconName: IconName.boolTrue,
            selected: typeof value === 'boolean' && value
        };
        const testId = `${propertyName}--InputTypeToggle--${InputType.booleanTrue}`;

        const spyGetChangePropertyAction = jest.spyOn(slice, 'changeProperty');

        // act
        render(
            <InputTypeToggle
                inputTypeProps={inputTypeProps}
                property={property}
                controlId={controlId}
                toggleOptions={[]}
                key={propertyName}
                controlName="controlName"
            />
        );
        fireEvent.click(screen.getByTestId(testId));
        cleanup();

        // assert
        expect(spyGetChangePropertyAction).toHaveBeenCalledTimes(1);
        expect(spyGetChangePropertyAction).toHaveBeenCalledWith(
            expect.objectContaining({
                controlId,
                propertyName,
                value: true
            })
        );
    });
});
