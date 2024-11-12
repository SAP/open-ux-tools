import { fireEvent, screen } from '@testing-library/react';
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
    FLOAT_VALUE_TYPE,
    INPUT_EDITOR_TYPE,
    INTEGER_VALUE_TYPE,
    PropertyType,
    STRING_VALUE_TYPE
} from '@sap-ux-private/control-property-editor-common';
import {
    getInputTypeToggleOptions,
    getDefaultInputType,
    InputTypeWrapper
} from '../../../../src/panels/properties/InputTypeWrapper';
import type { InputTypeToggleOptionProps } from '../../../../src/panels/properties/types';
import { InputType } from '../../../../src/panels/properties/types';
import { render } from '../../utils';

describe('InputTypeWrapper', () => {
    const controlId = 'testControlId';

    test('getDefaultInputType', () => {
        expect(getDefaultInputType(DROPDOWN_EDITOR_TYPE, STRING_VALUE_TYPE, 'option1')).toMatchInlineSnapshot(
            `"enumMember"`
        );
        expect(getDefaultInputType(INPUT_EDITOR_TYPE, STRING_VALUE_TYPE, 'some string')).toMatchInlineSnapshot(
            `"string"`
        );
        expect(getDefaultInputType(INPUT_EDITOR_TYPE, INTEGER_VALUE_TYPE, '10')).toMatchInlineSnapshot(`"number"`);
        expect(getDefaultInputType(INPUT_EDITOR_TYPE, FLOAT_VALUE_TYPE, '10.2345')).toMatchInlineSnapshot(`"number"`);
        expect(getDefaultInputType(CHECKBOX_EDITOR_TYPE, BOOLEAN_VALUE_TYPE, true)).toMatchInlineSnapshot(
            `"booleanTrue"`
        );
        expect(getDefaultInputType(CHECKBOX_EDITOR_TYPE, BOOLEAN_VALUE_TYPE, '{expression}')).toMatchInlineSnapshot(
            `"expression"`
        );
    });

    test('getInputTypeToggleOptions', () => {
        // Checkbox
        const propCheckbox: BooleanControlProperty = {
            editor: CHECKBOX_EDITOR_TYPE,
            type: BOOLEAN_VALUE_TYPE,
            value: true,
            isEnabled: false,
            name: 'testPropNameCheckbox',
            readableName: 'Test Prop Name Checkbox',
            propertyType: PropertyType.ControlProperty
        };
        expect(getInputTypeToggleOptions({ ...propCheckbox })).toMatchInlineSnapshot(`
            Array [
              Object {
                "iconName": "boolTrue",
                "inputType": "booleanTrue",
                "selected": true,
                "tooltip": "BOOLEAN_TYPE_TRUE",
              },
              Object {
                "iconName": "boolFalse",
                "inputType": "booleanFalse",
                "selected": false,
                "tooltip": "BOOLEAN_TYPE_FALSE",
              },
              Object {
                "iconName": "expression",
                "inputType": "expression",
                "selected": false,
                "tooltip": "EXPRESSION_TYPE",
              },
            ]
        `);
        expect(getInputTypeToggleOptions({ ...propCheckbox, value: false })).toMatchInlineSnapshot(`
            Array [
              Object {
                "iconName": "boolTrue",
                "inputType": "booleanTrue",
                "selected": false,
                "tooltip": "BOOLEAN_TYPE_TRUE",
              },
              Object {
                "iconName": "boolFalse",
                "inputType": "booleanFalse",
                "selected": true,
                "tooltip": "BOOLEAN_TYPE_FALSE",
              },
              Object {
                "iconName": "expression",
                "inputType": "expression",
                "selected": false,
                "tooltip": "EXPRESSION_TYPE",
              },
            ]
        `);
        expect(getInputTypeToggleOptions({ ...propCheckbox, value: '{myExpression}' })).toMatchInlineSnapshot(`
            Array [
              Object {
                "iconName": "boolTrue",
                "inputType": "booleanTrue",
                "selected": false,
                "tooltip": "BOOLEAN_TYPE_TRUE",
              },
              Object {
                "iconName": "boolFalse",
                "inputType": "booleanFalse",
                "selected": false,
                "tooltip": "BOOLEAN_TYPE_FALSE",
              },
              Object {
                "iconName": "expression",
                "inputType": "expression",
                "selected": true,
                "tooltip": "EXPRESSION_TYPE",
              },
            ]
        `);
        // String Input
        const propString: StringControlProperty = {
            editor: INPUT_EDITOR_TYPE,
            type: STRING_VALUE_TYPE,
            value: 'myString',
            isEnabled: true,
            name: 'testPropNameString',
            readableName: 'Test Prop Name String',
            propertyType: PropertyType.ControlProperty
        };
        expect(getInputTypeToggleOptions({ ...propString })).toMatchInlineSnapshot(`
            Array [
              Object {
                "iconName": "string",
                "inputType": "string",
                "selected": true,
                "tooltip": "STRING_TYPE",
              },
              Object {
                "iconName": "expression",
                "inputType": "expression",
                "selected": false,
                "tooltip": "EXPRESSION_TYPE",
              },
            ]
        `);
        expect(getInputTypeToggleOptions({ ...propString, value: '{myExpression}' })).toMatchInlineSnapshot(`
            Array [
              Object {
                "iconName": "string",
                "inputType": "string",
                "selected": false,
                "tooltip": "STRING_TYPE",
              },
              Object {
                "iconName": "expression",
                "inputType": "expression",
                "selected": true,
                "tooltip": "EXPRESSION_TYPE",
              },
            ]
        `);
        // Integer
        expect(getInputTypeToggleOptions({ ...propString, type: INTEGER_VALUE_TYPE, value: '10' }))
            .toMatchInlineSnapshot(`
            Array [
              Object {
                "iconName": "number",
                "inputType": "number",
                "selected": true,
                "tooltip": "INTEGER_TYPE",
              },
              Object {
                "iconName": "expression",
                "inputType": "expression",
                "selected": false,
                "tooltip": "EXPRESSION_TYPE",
              },
            ]
        `);
        expect(getInputTypeToggleOptions({ ...propString, type: INTEGER_VALUE_TYPE, value: '{myExpression}' }))
            .toMatchInlineSnapshot(`
            Array [
              Object {
                "iconName": "number",
                "inputType": "number",
                "selected": false,
                "tooltip": "INTEGER_TYPE",
              },
              Object {
                "iconName": "expression",
                "inputType": "expression",
                "selected": true,
                "tooltip": "EXPRESSION_TYPE",
              },
            ]
        `);
        // Float
        expect(getInputTypeToggleOptions({ ...propString, type: INTEGER_VALUE_TYPE, value: '10.23456' }))
            .toMatchInlineSnapshot(`
            Array [
              Object {
                "iconName": "number",
                "inputType": "number",
                "selected": true,
                "tooltip": "INTEGER_TYPE",
              },
              Object {
                "iconName": "expression",
                "inputType": "expression",
                "selected": false,
                "tooltip": "EXPRESSION_TYPE",
              },
            ]
        `);
        expect(getInputTypeToggleOptions({ ...propString, type: INTEGER_VALUE_TYPE, value: '{myExpression}' }))
            .toMatchInlineSnapshot(`
            Array [
              Object {
                "iconName": "number",
                "inputType": "number",
                "selected": false,
                "tooltip": "INTEGER_TYPE",
              },
              Object {
                "iconName": "expression",
                "inputType": "expression",
                "selected": true,
                "tooltip": "EXPRESSION_TYPE",
              },
            ]
        `);
        // Drop
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
            readableName: 'Test Prop Name Drop Down',
            propertyType: PropertyType.ControlProperty
        };
        expect(getInputTypeToggleOptions({ ...propDropDown })).toMatchInlineSnapshot(`
            Array [
              Object {
                "iconName": "dropdown",
                "inputType": "enumMember",
                "selected": true,
                "tooltip": "ENUM_TYPE",
              },
              Object {
                "iconName": "expression",
                "inputType": "expression",
                "selected": false,
                "tooltip": "EXPRESSION_TYPE",
              },
            ]
        `);
        expect(getInputTypeToggleOptions({ ...propDropDown, value: '{myExpression}' })).toMatchInlineSnapshot(`
            Array [
              Object {
                "iconName": "dropdown",
                "inputType": "enumMember",
                "selected": false,
                "tooltip": "ENUM_TYPE",
              },
              Object {
                "iconName": "expression",
                "inputType": "expression",
                "selected": true,
                "tooltip": "EXPRESSION_TYPE",
              },
            ]
        `);
        expect(getInputTypeToggleOptions({ ...propDropDown, value: '{myIncompleteExpression' })).toMatchInlineSnapshot(`
            Array [
              Object {
                "iconName": "dropdown",
                "inputType": "enumMember",
                "selected": false,
                "tooltip": "ENUM_TYPE",
              },
              Object {
                "iconName": "expression",
                "inputType": "expression",
                "selected": false,
                "tooltip": "EXPRESSION_TYPE",
              },
            ]
        `);
    });

    test('render (for boolean value)', () => {
        const value = true;
        const propertyName = 'testProperty';
        const property: BooleanControlProperty = {
            type: BOOLEAN_VALUE_TYPE,
            editor: CHECKBOX_EDITOR_TYPE,
            isEnabled: false,
            name: propertyName,
            readableName: 'Test Property',
            value,
            documentation: {
                defaultValue: 'testDefault',
                description: 'Test doc',
                propertyName: propertyName,
                type: BOOLEAN_VALUE_TYPE,
                propertyType: 'testingTypeText'
            },
            propertyType: PropertyType.ControlProperty
        };
        const toggleOptions: InputTypeToggleOptionProps[] = getInputTypeToggleOptions(property);
        render(
            <InputTypeWrapper
                property={property}
                controlId={controlId}
                key={propertyName}
                toggleOptions={toggleOptions}
                controlName="controlName"
            />
        );

        const label = screen.getByTestId(`${propertyName}--Label`);
        expect(label).toBeInTheDocument();

        const inputTypeTrue = screen.getByTestId(`${propertyName}--InputTypeToggle--${InputType.booleanTrue}`);
        expect(inputTypeTrue).toBeInTheDocument();
        const inputTypeFalse = screen.getByTestId(`${propertyName}--InputTypeToggle--${InputType.booleanFalse}`);
        expect(inputTypeFalse).toBeInTheDocument();
        const inputTypeExpression = screen.getByTestId(`${propertyName}--InputTypeToggle--${InputType.expression}`);
        expect(inputTypeExpression).toBeInTheDocument();

        // no expression input since value is boolean
        let exception: Error | null = null;
        try {
            screen.getByTestId(`${propertyName}--StringEditor`);
        } catch (e) {
            exception = e as Error;
        }
        expect(exception).toBeTruthy();
    });

    test('delete property changes', async () => {
        const propertyName = 'testProperty';
        const property: StringControlProperty = {
            editor: INPUT_EDITOR_TYPE,
            type: STRING_VALUE_TYPE,
            value: 'myString',
            isEnabled: true,
            name: propertyName,
            readableName: 'Test Prop Name String',
            documentation: {
                defaultValue: 'testDefault',
                description: 'Test doc',
                propertyName: propertyName,
                type: 'string',
                propertyType: 'testingTypeText'
            },
            propertyType: PropertyType.ControlProperty
        };
        const toggleOptions: InputTypeToggleOptionProps[] = getInputTypeToggleOptions(property);
        const { dispatch } = render(
            <InputTypeWrapper
                property={property}
                controlId={controlId}
                key={propertyName}
                toggleOptions={toggleOptions}
                controlName="controlName"
            />,
            {
                initialState: {
                    selectedControl: {
                        id: 'control1'
                    } as any,
                    changes: {
                        stack: [],
                        controls: {
                            control1: {
                                pending: 0,
                                saved: 1,
                                properties: {
                                    testProperty: {
                                        saved: 1,
                                        pending: 0,
                                        lastSavedChange: {
                                            propertyName,
                                            value: 'old value',
                                            type: 'saved',
                                            fileName: 'file',
                                            timestamp: 123,
                                            controlId: 'control1'
                                        }
                                    }
                                }
                            }
                        }
                    }
                } as any
            }
        );

        const label = screen.getByTestId(`${propertyName}--Label`);

        fireEvent.mouseOver(label);

        const deleteButton = await screen.findByRole('button', { name: 'Delete all changes for this property' });

        deleteButton.click();

        expect(
            screen.getByText(
                /Are you sure you want to delete all changes for this property\? This action cannot be undone\./i
            )
        ).toBeInTheDocument();

        const confirmButton = screen.getByRole('button', { name: /^Delete$/i });
        // const confirmButton = screen.getByText(/Delete/i);
        confirmButton.click();

        expect(dispatch).toHaveBeenCalledWith({
            type: '[ext] delete-property-changes',
            payload: { controlId: 'control1', propertyName, fileName: 'file' }
        });
    });
});
