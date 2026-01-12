import * as React from 'react';
import { render } from '@testing-library/react';
import { fireEvent, screen } from '@testing-library/dom';
import { CloudSystem } from '../../../../../../src/components/layout/main/systemInfo/CloudSystem';

describe('<CloudSystem />', () => {
    it('should render url input box for reentrance ticket auth type', () => {
        const setUrl = jest.fn();
        const setIsDetailsUpdated = jest.fn();

        render(
            <CloudSystem
                systemInfo={{
                    name: 'btp system',
                    url: 'https://mock.btp.system',
                    authenticationType: 'reentranceTicket',
                    systemType: 'AbapCloud',
                    connectionType: 'abap_catalog'
                }}
                setUrl={setUrl}
                setIsDetailsUpdated={setIsDetailsUpdated}
            />
        );

        const input = document.getElementById(`reentranceUrl`);
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
                    },
                    systemType: 'AbapCloud',
                    connectionType: 'abap_catalog'
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

    it('should only ever return one component', () => {
        const setUrl = jest.fn();
        const setIsDetailsUpdated = jest.fn();

        // Test reentrance ticket takes priority over service keys if both are present
        const { rerender } = render(
            <CloudSystem
                systemInfo={{
                    name: 'btp system',
                    url: 'https://mock.btp.system',
                    authenticationType: 'reentranceTicket',
                    serviceKeys: {
                        mockKey: 'mockValue'
                    },
                    systemType: 'AbapCloud',
                    connectionType: 'abap_catalog'
                }}
                setUrl={setUrl}
                setIsDetailsUpdated={setIsDetailsUpdated}
            />
        );

        // Should show reentrance ticket input, not service key component
        const reentranceInput = document.getElementById('reentranceUrl');
        expect(reentranceInput).toBeTruthy();
        expect(screen.queryByText(/Service Key/i)).toBeNull();

        // Test system without service keys shows empty div
        rerender(
            <CloudSystem
                systemInfo={{
                    name: 'btp system',
                    url: 'https://mock.btp.system',
                    authenticationType: 'basic',
                    systemType: 'AbapCloud',
                    connectionType: 'abap_catalog'
                }}
                setUrl={setUrl}
                setIsDetailsUpdated={setIsDetailsUpdated}
            />
        );

        // Should not show URL or client fields when no service keys
        expect(screen.queryByDisplayValue('https://mock.btp.system')).toBeNull();
    });
});
