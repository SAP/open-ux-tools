import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SystemName } from '../../../../../../src/components/layout/main/systemInfo/SystemName';

describe('<SystemName />', () => {
    it('Test inputs', () => {
        const setName = jest.fn();
        const setIsDetailsUpdated = jest.fn();
        const systemName = 'dummyName';
        const eventUser = {
            target: { value: 'input-value' }
        };

        render(<SystemName systemName={systemName} setName={setName} setIsDetailsUpdated={setIsDetailsUpdated} />);

        const nameInput = screen.getByDisplayValue('dummyName');
        fireEvent.change(nameInput, eventUser);

        expect(setName).toHaveBeenCalledWith('input-value');
        expect(setIsDetailsUpdated).toHaveBeenCalled();
    });
});
