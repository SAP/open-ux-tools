import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

import * as actualUiComponents from '@sap-ux/ui-components';

jest.unstable_mockModule('@sap-ux/ui-components', () => ({
    ...actualUiComponents,
    UITooltip: ({ children }: any) => <div>{children}</div>,
    UIIcon: () => <span data-testid="info-icon" />,
    UITextInput: ({ value, onChange, label, ...rest }: any) => (
        <div>
            {label && <label>{label}</label>}
            <input role="textbox" value={value || ''} onChange={onChange} {...rest} />
        </div>
    )
}));

const { ServicePath } = await import('../../../../../../src/components/layout/main/systemInfo/ServicePath');

describe('<ServicePath />', () => {
    it('should render the service path label', () => {
        const setServicePath = jest.fn();
        const setIsDetailsUpdated = jest.fn();
        render(<ServicePath setServicePath={setServicePath} setIsDetailsUpdated={setIsDetailsUpdated} />);

        expect(screen.getByText('Service Path')).toBeInTheDocument();
    });

    it('should call setServicePath and setIsDetailsUpdated on input change', () => {
        const setServicePath = jest.fn();
        const setIsDetailsUpdated = jest.fn();
        render(<ServicePath setServicePath={setServicePath} setIsDetailsUpdated={setIsDetailsUpdated} />);

        const input = screen.getByRole('textbox');
        fireEvent.change(input, { target: { value: '/sap/opu/odata/sap/MY_SERVICE' } });

        expect(setServicePath).toHaveBeenCalledWith('/sap/opu/odata/sap/MY_SERVICE');
        expect(setIsDetailsUpdated).toHaveBeenCalledWith(true);
    });

    it('should render the info icon', () => {
        const setServicePath = jest.fn();
        const setIsDetailsUpdated = jest.fn();
        render(<ServicePath setServicePath={setServicePath} setIsDetailsUpdated={setIsDetailsUpdated} />);

        expect(screen.getByTestId('info-icon')).toBeInTheDocument();
    });
});
