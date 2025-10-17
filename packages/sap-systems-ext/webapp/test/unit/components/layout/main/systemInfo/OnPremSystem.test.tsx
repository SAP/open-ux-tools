import * as React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OnPremSystem } from '../../../../../../src/components/layout/main/systemInfo/OnPremSystem';
import { BackendSystem } from '@sap-ux/store';

describe('<OnPremSystem />', () => {
    it('Test inputs', () => {
        const setUrl = jest.fn();
        const setClient = jest.fn();
        const setUsername = jest.fn();
        const setPassword = jest.fn();
        const setIsDetailsUpdated = jest.fn();
        const setIsDetailsValid = jest.fn();

        const urlEvent = {
            target: { value: 'http://mock.url.com' }
        };

        const clientEvent = {
            target: { value: '100' }
        };

        const systemInfo: BackendSystem = {
            name: 'systemName',
            url: 'https://dummy.com',
            client: '000',

            username: 'user',
            password: 'password'
        };

        render(
            <OnPremSystem
                systemInfo={systemInfo}
                setUrl={setUrl}
                setClient={setClient}
                setUsername={setUsername}
                setPassword={setPassword}
                setIsDetailsUpdated={setIsDetailsUpdated}
                setIsDetailsValid={setIsDetailsValid}
            />
        );

        const urlInput = document.getElementById('sysUrl');
        const clientInput = document.getElementById('sysClient');

        if (urlInput) {
            fireEvent.change(urlInput, urlEvent);
        }
        if (clientInput) {
            fireEvent.change(clientInput, clientEvent);
        }

        expect(setUrl).toHaveBeenCalledWith(urlEvent.target.value);
        expect(setClient).toHaveBeenCalledWith('100');
        expect(setIsDetailsUpdated).toHaveBeenCalled();
        expect(setIsDetailsValid).toHaveBeenCalledWith(true);
    });
});
