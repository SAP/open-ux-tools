import * as React from 'react';
import { render } from '@testing-library/react';
import { fireEvent, screen } from '@testing-library/dom';
import { CloudSystem } from '../../../../../../src/components/layout/main/systemInfo/CloudSystem';

describe('<BTPSystem />', () => {
    it('should render url input box for reentrance ticket auth type', () => {
        const setUrl = jest.fn();
        const setIsDetailsUpdated = jest.fn();

        render(
            <CloudSystem
                systemInfo={{
                    name: 'btp system',
                    url: 'https://mock.btp.system',
                    authenticationType: 'reentranceTicket'
                }}
                setUrl={setUrl}
                setIsDetailsUpdated={setIsDetailsUpdated}
            />
        );

        const input = document.getElementById(`s4HUrl`);
        fireEvent.change(input as HTMLElement, {
            target: { value: 'https://mock.s4.hana.sap' }
        });

        expect(setUrl).toHaveBeenCalledWith('https://mock.s4.hana.sap');
        expect(setIsDetailsUpdated).toHaveBeenCalledWith(true);
    });

    it('should render readonly url/client and service key component for service key auth type', () => {
        const setUrl = jest.fn();
        const setIsDetailsUpdated = jest.fn();

        render(
            <CloudSystem
                systemInfo={{
                    name: 'btp system',
                    url: 'https://mock.service.key.url',
                    serviceKeys: {
                        mockKey: 'mockValue'
                    }
                }}
                setUrl={setUrl}
                setIsDetailsUpdated={setIsDetailsUpdated}
            />
        );

        const urlLabel = screen.getByText(/URL/i);
        expect(urlLabel).toBeDefined();
        const inputField = urlLabel.nextElementSibling?.querySelector('.ms-TextField-field');
        expect((inputField as HTMLInputElement).value).toBe('https://mock.service.key.url');
    });
});
