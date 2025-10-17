import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SystemActionBtns } from '../../../../../../src/components/layout/main/buttons/SystemActionBtns';
import { actions } from '../../../../../../src/state';
import { BackendSystem } from '@sap-ux/store';

describe('<Buttons />', () => {
    const systemInfoOnPrem: BackendSystem = {
        name: 'sysName',
        systemType: 'OnPrem',
        url: 'https://url.com',
        client: '000',
        username: 'user',
        password: 'pass'
    };

    const systemInfoBTP: BackendSystem = {
        name: 'sysName',
        systemType: 'AbabCloud',
        url: 'https://url.com',
        serviceKeys: 'test-service-key'
    };

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('Test Connection button (on prem)', () => {
        render(
            <SystemActionBtns
                systemInfo={systemInfoOnPrem}
                testConnectionBtnDisabled={false}
                saveButtonDisabled={true}
                isDetailsUpdated={false}
                resetStatus={jest.fn()}
            />
        );

        const testConnectionSpy = jest.spyOn(actions, 'testConnection');

        const testConBtn = screen.getByRole('button', { name: 'Test Connection' });
        expect(testConBtn).not.toHaveClass('ms-Button--primary');
        fireEvent.click(testConBtn);

        expect(testConnectionSpy).toHaveBeenCalledWith(systemInfoOnPrem);
    });

    it('Test Connection button (BTP)', () => {
        render(
            <SystemActionBtns
                systemInfo={systemInfoBTP}
                testConnectionBtnDisabled={false}
                saveButtonDisabled={true}
                isDetailsUpdated={false}
                resetStatus={jest.fn()}
            />
        );

        const testConnectionSpy = jest.spyOn(actions, 'testConnection');

        const testConBtn = screen.getByRole('button', { name: 'Test Connection' });
        fireEvent.click(testConBtn);

        expect(testConnectionSpy).toHaveBeenCalledWith(systemInfoBTP);
    });

    it('Test Save system button (on-prem)', () => {
        render(
            <SystemActionBtns
                systemInfo={systemInfoOnPrem}
                testConnectionBtnDisabled={false}
                saveButtonDisabled={false}
                connectionStatus={{ connected: true, message: 'Connected' }}
                isDetailsUpdated={false}
                resetStatus={jest.fn()}
            />
        );

        const testConBtn = screen.getByRole('button', { name: 'Test Connection' });
        expect(testConBtn).toBeEnabled();

        const updateSystemSpy = jest.spyOn(actions, 'updateSystem');

        const saveBtn = screen.getByRole('button', { name: 'Save' });
        expect(saveBtn).toHaveClass('ms-Button--primary');
        fireEvent.click(saveBtn);

        expect(updateSystemSpy).toHaveBeenCalledWith(systemInfoOnPrem);
    });

    it('Test Save system button (confirmation prompt - yes)', () => {
        render(
            <SystemActionBtns
                systemInfo={systemInfoOnPrem}
                saveButtonDisabled={false}
                connectionStatus={{ connected: false, message: 'Not connected' }}
                isDetailsUpdated={false}
                resetStatus={jest.fn()}
            />
        );

        const updateSystemSpy = jest.spyOn(actions, 'updateSystem');

        const saveBtn = screen.getByRole('button', { name: 'Save' });
        fireEvent.click(saveBtn);

        const confirmBtn = screen.getByRole('button', { name: 'Yes' });
        fireEvent.click(confirmBtn);

        expect(updateSystemSpy).toHaveBeenCalledWith(systemInfoOnPrem);
    });

    it('Test Save system button (confirmation prompt - no)', () => {
        render(
            <SystemActionBtns
                systemInfo={systemInfoOnPrem}
                saveButtonDisabled={false}
                connectionStatus={{ connected: false, message: 'Not connected' }}
                isDetailsUpdated={false}
                resetStatus={jest.fn()}
            />
        );

        const updateSystemSpy = jest.spyOn(actions, 'updateSystem');

        const saveBtn = screen.getByRole('button', { name: 'Save' });
        fireEvent.click(saveBtn);

        const cancelBtn = screen.getByRole('button', { name: 'No' });
        fireEvent.click(cancelBtn);

        expect(updateSystemSpy).not.toHaveBeenCalled();
    });

    it('Test Save system button (BTP)', () => {
        render(
            <SystemActionBtns
                systemInfo={systemInfoBTP}
                saveButtonDisabled={false}
                connectionStatus={{ connected: true, message: 'Connected' }}
                isDetailsUpdated={false}
                resetStatus={jest.fn()}
            />
        );

        const updateSystemSpy = jest.spyOn(actions, 'updateSystem');

        const saveBtn = screen.getByRole('button', { name: 'Save' });
        fireEvent.click(saveBtn);

        expect(updateSystemSpy).toHaveBeenCalledWith(systemInfoBTP);
    });
});
