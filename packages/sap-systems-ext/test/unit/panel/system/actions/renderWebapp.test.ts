import { jest } from '@jest/globals';
import type { PanelContext } from '../../../../../src/types';
import { SystemPanelViewType } from '../../../../../src/utils/constants';

const systemServiceReadMock = jest.fn();

const realStore = await import('@sap-ux/store');
jest.unstable_mockModule('@sap-ux/store', () => ({
    ...realStore,
    getService: jest.fn().mockImplementation(() => ({
        read: systemServiceReadMock
    }))
}));

const realPanelUtils = await import('../../../../../src/panel/system/utils');
jest.unstable_mockModule('../../../../../src/panel/system/utils', () => ({
    ...realPanelUtils,
    showFileSaveDialog: jest.fn()
}));

jest.unstable_mockModule('fs', () => ({
    default: {},
    writeFileSync: jest.fn(),
    readFileSync: jest.fn()
}));

const { renderWebApp } = await import('../../../../../src/panel/system/actions/renderWebapp');
const { initI18n } = await import('../../../../../src/utils');

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
