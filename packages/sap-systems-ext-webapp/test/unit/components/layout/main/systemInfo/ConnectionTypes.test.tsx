import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ConnectionTypes } from '../../../../../../src/components/layout/main/systemInfo/ConnectionTypes';

jest.mock('@sap-ux/ui-components', () => {
    const UIDropdown = ({ onChange, options, selectedKey }: any) => (
        <select
            data-testid="connection-type-dropdown"
            value={selectedKey}
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

describe('<ConnectionTypes />', () => {
    it('should render with default abap_catalog selection when no connectionType is provided', () => {
        const setConnectionType = jest.fn();
        render(<ConnectionTypes setConnectionType={setConnectionType} />);

        expect(screen.getByText('Connection Type')).toBeInTheDocument();
        const dropdown = screen.getByTestId('connection-type-dropdown') as HTMLSelectElement;
        expect(dropdown.value).toBe('abap_catalog');
    });

    it('should render with the provided connectionType selected', () => {
        const setConnectionType = jest.fn();
        render(<ConnectionTypes connectionType="odata_service" setConnectionType={setConnectionType} />);

        const dropdown = screen.getByTestId('connection-type-dropdown') as HTMLSelectElement;
        expect(dropdown.value).toBe('odata_service');
    });

    it('should call setConnectionType with odata_service when Service URL Endpoint is selected', () => {
        const setConnectionType = jest.fn();
        render(<ConnectionTypes setConnectionType={setConnectionType} />);

        const dropdown = screen.getByTestId('connection-type-dropdown');
        fireEvent.change(dropdown, { target: { value: 'odata_service' } });

        expect(setConnectionType).toHaveBeenCalledWith('odata_service');
    });

    it('should call setConnectionType with generic_host when Generic Host is selected', () => {
        const setConnectionType = jest.fn();
        render(<ConnectionTypes setConnectionType={setConnectionType} />);

        const dropdown = screen.getByTestId('connection-type-dropdown');
        fireEvent.change(dropdown, { target: { value: 'generic_host' } });

        expect(setConnectionType).toHaveBeenCalledWith('generic_host');
    });

    it('should call setConnectionType with abap_catalog when ABAP Catalog is selected', () => {
        const setConnectionType = jest.fn();
        render(<ConnectionTypes connectionType="generic_host" setConnectionType={setConnectionType} />);

        const dropdown = screen.getByTestId('connection-type-dropdown');
        fireEvent.change(dropdown, { target: { value: 'abap_catalog' } });

        expect(setConnectionType).toHaveBeenCalledWith('abap_catalog');
    });

    it('should render all three connection type options', () => {
        const setConnectionType = jest.fn();
        render(<ConnectionTypes setConnectionType={setConnectionType} />);

        expect(screen.getByText('ABAP Catalog')).toBeInTheDocument();
        expect(screen.getByText('Service URL Endpoint')).toBeInTheDocument();
        expect(screen.getByText('Generic Host')).toBeInTheDocument();
    });
});
