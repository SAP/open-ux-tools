import { screen, fireEvent } from '@testing-library/react';
import { render } from '../../utils';
import React from 'react';
import type { IconValueHelpProps } from '../../../../src/panels/properties/IconValueHelp';
import { IconValueHelp } from '../../../../src/panels/properties/IconValueHelp';
import { PropertyType } from '@sap-ux-private/control-property-editor-common';

describe('IconValueHelp', () => {
    const iconValueHelpProps: IconValueHelpProps = {
        controlId: 'testControlId',
        icons: [
            {
                content: 'testData1',
                fontFamily: 'SAP-fontFamily',
                name: 'testName1'
            },
            {
                content: 'testData2',
                fontFamily: 'SAP-fontFamily',
                name: 'testName2'
            },
            {
                content: 'testData3',
                fontFamily: 'SAP-fontFamily',
                name: 'testName3'
            }
        ],
        controlName: 'controlName',
        propertyName: 'testProperty',
        value: 'testValue',
        disabled: false,
        propertyType: PropertyType.ControlProperty
    };
    test('initial load', () => {
        render(<IconValueHelp {...iconValueHelpProps} />);
        const button = screen.getByRole('button');
        fireEvent.click(button);
        const title = screen.getByRole('heading', { name: /select icon/i });
        const searchBox = screen.getByRole('searchbox');
        const okButton = screen.getByRole('button', { name: /ok/i });

        expect(title).toBeInTheDocument();
        expect(searchBox).toBeInTheDocument();
        expect(screen.getAllByRole('row').length).toEqual(5);
        fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'testName1' } });
        expect(screen.getAllByRole('row').length).toEqual(3);
        fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } });
        expect(okButton).toBeInTheDocument();

        screen.getByText(/testname2/i).click();
        okButton.click();

        fireEvent.click(button);
        const cancelButton = screen.getByRole('button', { name: /cancel/i });
        expect(cancelButton).toBeInTheDocument();
        cancelButton.click();
    });
});
