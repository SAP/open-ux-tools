import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ConnectionTypes } from '../../../../../../src/components/layout/main/systemInfo/ConnectionTypes';

describe('<ConnectionTypes />', () => {
    it('Test choice group', () => {
        const setConnectionType = jest.fn();
        render(<ConnectionTypes setConnectionType={setConnectionType} />);

        const serviceUrlOption = screen.getByLabelText('Service URL endpoint');

        fireEvent.click(serviceUrlOption);

        expect(screen.getByText('Connection Type')).toBeInTheDocument();
        expect(setConnectionType).toHaveBeenCalledWith('odata_service');
    });
});
