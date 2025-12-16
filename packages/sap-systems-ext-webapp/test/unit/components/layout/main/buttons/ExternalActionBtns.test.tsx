import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ExternalActionBtns } from '../../../../../../src/components/layout/main/buttons/ExternalActionBtns';
import { actions } from '../../../../../../src/state';
import type { BackendSystem } from '@sap-ux/store';

describe('<ActionButtons />', () => {
    const systemInfo: BackendSystem = {
        name: 'test system',
        systemType: 'OnPrem',
        url: 'https://dummy.com',
        client: '000',
        username: 'user',
        password: 'password',
        connectionType: 'abap_catalog'
    };
    it('Test Export button', () => {
        render(<ExternalActionBtns systemInfo={systemInfo} systemUnSaved={false} />);
        const exportSystemSpy = jest.spyOn(actions, 'exportSystem');

        const exportSystemButton = screen.getByRole('button', { name: 'Export System' });
        fireEvent.click(exportSystemButton);

        expect(exportSystemSpy).toHaveBeenCalledWith(systemInfo);
    });

    it('Test Create SAP Fiori application button', () => {
        render(<ExternalActionBtns systemInfo={systemInfo} systemUnSaved={false} />);

        const createFioriProjectSpy = jest.spyOn(actions, 'createFioriProject');

        const createFioriAppBtn = screen.getByRole('button', { name: 'Create SAP Fiori Application' });
        fireEvent.click(createFioriAppBtn);

        expect(createFioriProjectSpy).toHaveBeenCalledWith(systemInfo);
    });
});
