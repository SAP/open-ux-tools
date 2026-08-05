import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

jest.unstable_mockModule('@sap-ux/ui-components', () => {
    const UIDropdown = ({ onChange, options, selectedKey }: any) => (
        <select
            data-testid="system-type-dropdown"
            value={selectedKey ?? ''}
            onChange={(e: any) => {
                const selectedOption = options.find((opt: any) => opt.key === e.target.value);
                onChange(e, selectedOption);
            }}>
            <option value="" />
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

const { SystemTypes } = await import('../../../../../../src/components/layout/main/systemTypes/SystemTypes');

describe('<SystemTypes />', () => {
    it('Test selecting Cloud system type', () => {
        const setSystemType = jest.fn();
        const setAuthenticationType = jest.fn();
        render(<SystemTypes setSystemType={setSystemType} setAuthenticationType={setAuthenticationType} />);

        const systemTypeLabel = screen.getByText('System Type');
        expect(systemTypeLabel).toBeInTheDocument();

        // Find the dropdown and select Cloud system type
        const dropdown = screen.getByTestId('system-type-dropdown');
        fireEvent.change(dropdown, { target: { value: 'AbapCloud' } });

        expect(setSystemType).toHaveBeenCalledWith('AbapCloud');
        expect(setAuthenticationType).toHaveBeenCalledWith('reentranceTicket');
    });

    it('Test selecting OnPremise system type', () => {
        const setSystemType = jest.fn();
        const setAuthenticationType = jest.fn();
        render(<SystemTypes setSystemType={setSystemType} setAuthenticationType={setAuthenticationType} />);

        const systemTypeLabel = screen.getByText('System Type');
        expect(systemTypeLabel).toBeInTheDocument();

        // Find the dropdown and select OnPremise system type
        const dropdown = screen.getByTestId('system-type-dropdown');
        fireEvent.change(dropdown, { target: { value: 'OnPrem' } });

        expect(setSystemType).toHaveBeenCalledWith('OnPrem');
        expect(setAuthenticationType).toHaveBeenCalledWith('basic');
    });

    it('pre-populates the dropdown with the provided system type', () => {
        render(
            <SystemTypes setSystemType={jest.fn()} setAuthenticationType={jest.fn()} systemType={'OnPrem'} />
        );

        const dropdown = screen.getByTestId('system-type-dropdown') as HTMLSelectElement;
        expect(dropdown.value).toBe('OnPrem');
    });
});
