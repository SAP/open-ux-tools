import type { PanelContext } from '../../../../../src/types';
import { renderWebApp } from '../../../../../src/panel/system/actions/renderWebapp';
import { initI18n } from '../../../../../src/utils';
import { SystemPanelViewType } from '../../../../../src/utils/constants';

const systemServiceReadMock = jest.fn();

jest.mock('@sap-ux/store', () => ({
    ...jest.requireActual('@sap-ux/store'),
    getService: jest.fn().mockImplementation(() => ({
        read: systemServiceReadMock
    }))
}));

jest.mock('../../../../../src/panel/system/utils', () => ({
    ...jest.requireActual('../../../../../src/panel/system/utils'),
    showFileSaveDialog: jest.fn()
}));

jest.mock('fs');

describe('Test the render webapp action', () => {
    beforeAll(async () => {
        await initI18n();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    const backendSystem = {
        url: 'https://example.com',
        client: '100',
        name: 'Test System',
        systemType: 'OnPrem'
    };
    const postMessageSpy = jest.fn();

    const basePanelContext = {
        backendSystem,
        disposePanel: jest.fn(),
        isGuidedAnswersEnabled: false,
        postMessage: postMessageSpy
    } as unknown as PanelContext;

    it('should call cal the post message for creating a new system', async () => {
        const panelContext = {
            ...basePanelContext,
            panelViewType: SystemPanelViewType.Create
        } as PanelContext;

        await renderWebApp(panelContext);

        expect(postMessageSpy).toHaveBeenCalledWith({ type: 'SYSTEM_INFO_LOADING' });
        expect(postMessageSpy).toHaveBeenCalledWith({ type: 'CREATE_NEW_SYSTEM' });
    });

    it('should call cal the post message for viewing an existing saved system', async () => {
        const panelContext = {
            ...basePanelContext,
            panelViewType: SystemPanelViewType.View
        } as PanelContext;

        await renderWebApp(panelContext);

        expect(postMessageSpy).toHaveBeenCalledWith({ type: 'SYSTEM_INFO_LOADING' });
        expect(postMessageSpy).toHaveBeenCalledWith({
            type: 'SYSTEM_INFO',
            payload: { systemInfo: backendSystem, unSaved: false }
        });
    });

    it('should call cal the post message for viewing an existing saved system with a system status message', async () => {
        const panelContext = {
            ...basePanelContext,
            panelViewType: SystemPanelViewType.View,
            systemStatusMessage: 'Test status message'
        } as PanelContext;

        await renderWebApp(panelContext);

        expect(postMessageSpy).toHaveBeenCalledWith({ type: 'SYSTEM_INFO_LOADING' });
        expect(postMessageSpy).toHaveBeenCalledWith({
            type: 'SYSTEM_INFO',
            payload: { systemInfo: backendSystem, unSaved: false }
        });
        expect(postMessageSpy).toHaveBeenCalledWith({
            type: 'UPDATE_SYSTEM_STATUS',
            payload: { message: 'Test status message', updateSuccess: true }
        });
    });

    it('should call cal the post message for viewing an imported system', async () => {
        const panelContext = {
            ...basePanelContext,
            panelViewType: SystemPanelViewType.Import
        } as PanelContext;

        await renderWebApp(panelContext);

        expect(postMessageSpy).toHaveBeenCalledWith({ type: 'SYSTEM_INFO_LOADING' });
        expect(postMessageSpy).toHaveBeenCalledWith({
            type: 'SYSTEM_INFO',
            payload: { systemInfo: backendSystem, unSaved: true }
        });
    });
});
