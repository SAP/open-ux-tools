import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SystemTypes } from '../../../../../../src/components/layout/main/systemTypes/SystemTypes';

jest.mock('@sap-ux/ui-components', () => {
    const UIDropdown = ({ onChange, options }: any) => (
        <select
            data-testid="system-type-dropdown"
            onChange={(e) => {
                const selectedOption = options.find((opt: any) => opt.key === e.target.value);
                onChange(e, selectedOption);
            }}>
            {options.map((option: any) => (
                <option key={option.key} value={option.key}>
                    {option.text}
                </option>
            ))}
        </select>
    );
    UIDropdown.displayName = 'UIDropdown';
    return { UIDropdown };
});

describe('<SystemTypes />', () => {
    it('Test selecting Cloud system type', () => {
        const setType = jest.fn();

        render(<SystemTypes setType={setType} />);

        const systemTypeLabel = screen.getByText('System Type');
        expect(systemTypeLabel).toBeInTheDocument();

        // Find the dropdown and select Cloud system type
        const dropdown = screen.getByTestId('system-type-dropdown');
        fireEvent.change(dropdown, { target: { value: 'AbapCloud' } });

        expect(setType).toHaveBeenCalledWith('AbapCloud');
    });

    it('Test selecting OnPremise system type', () => {
        const setType = jest.fn();

        render(<SystemTypes setType={setType} />);

        const systemTypeLabel = screen.getByText('System Type');
        expect(systemTypeLabel).toBeInTheDocument();

        // Find the dropdown and select OnPremise system type
        const dropdown = screen.getByTestId('system-type-dropdown');
        fireEvent.change(dropdown, { target: { value: 'OnPrem' } });

        expect(setType).toHaveBeenCalledWith('OnPrem');
    });
});
