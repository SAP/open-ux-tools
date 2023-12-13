import { cleanup, fireEvent, screen } from '@testing-library/react';
import React from 'react';
import type { StringControlPropertyWithOptions } from '@sap-ux-private/control-property-editor-common';
import { DROPDOWN_EDITOR_TYPE, STRING_VALUE_TYPE } from '@sap-ux-private/control-property-editor-common';
import { DropdownEditor, valueChanged } from '../../../../src/panels/properties/DropdownEditor';
import * as slice from '../../../../src/slice';
import '@testing-library/jest-dom';

import { render } from '../../utils';

describe('DropdownEditor', () => {
    test('render & click (for boolean value)', async () => {
        // arrange
        const controlId = 'testControlId';
        const propertyName = 'testProperty';
        const value = 'option1';
        const property: StringControlPropertyWithOptions = {
            type: STRING_VALUE_TYPE,
            editor: DROPDOWN_EDITOR_TYPE,
            isEnabled: true,
            name: propertyName,
            value,
            readableName: '',
            options: [
                { key: 'option1', text: 'option1' },
                { key: 'option2', text: 'option2' }
            ]
        };
        const testId = `${propertyName}--DropdownEditor`;
        jest.spyOn(slice, 'changeProperty');

        cleanup();

        // act
        const { dispatch } = render(<DropdownEditor property={property} controlId={controlId} controlName="Button" />);
        const dropDownEditor = screen.getByTestId(testId);
        const dropDownEditorInput = dropDownEditor.querySelector('input');
        jest.spyOn(window, 'setTimeout').mockImplementation((cb: any) => {
            cb(undefined, undefined, 'option2');
        });
        if (dropDownEditorInput) {
            fireEvent.focus(dropDownEditorInput);
            fireEvent.input(dropDownEditorInput, { target: { value: 'option2' } });
            fireEvent.blur(dropDownEditorInput);
        }
        expect(dispatch).toBeCalledTimes(1);
    });
    test('valueChanged function', () => {
        const result = valueChanged('testControlId', 'testPropertyName', 'newValue', 'Button');
        expect(result).toMatchInlineSnapshot(`
            Object {
              "payload": Object {
                "controlId": "testControlId",
                "controlName": "Button",
                "propertyName": "testPropertyName",
                "value": "newValue",
              },
              "type": "app/change-property",
            }
        `);
    });
});
