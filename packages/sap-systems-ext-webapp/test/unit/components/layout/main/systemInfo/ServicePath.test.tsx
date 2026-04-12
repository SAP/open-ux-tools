import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ServicePath } from '../../../../../../src/components/layout/main/systemInfo/ServicePath';

jest.mock('@sap-ux/ui-components', () => ({
    ...jest.requireActual('@sap-ux/ui-components'),
    UITooltip: ({ children }: any) => <div>{children}</div>,
    UIIcon: () => <span data-testid="info-icon" />
}));

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
