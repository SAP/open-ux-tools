import { cleanup, fireEvent, screen } from '@testing-library/react';
import React from 'react';
import type { StringControlPropertyWithOptions } from '@sap-ux/control-property-editor-common';
import { DROPDOWN_EDITOR_TYPE, STRING_VALUE_TYPE } from '@sap-ux/control-property-editor-common';
import { DropdownEditor, valueChanged } from '../../../../../src/app/panels/properties/DropdownEditor';
import * as slice from '../../../../../src/app/slice';

import { render } from '../../utils';

describe('DropdownEditor', () => {
    test('render & click (for boolean value)', () => {
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
        render(<DropdownEditor property={property} controlId={controlId} controlName="Button" />);
        const dropDownEditor = screen.getByTestId(testId);
        fireEvent.change(dropDownEditor, { target: { text: 'option2' } }); // { value: 'option2' } })
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
