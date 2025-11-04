import { updateSystem } from '../../../../../src/panel/system/actions/updateSystem';
import type { PanelContext } from '../../../../../src/types';
import { initI18n } from '../../../../../src/utils';
import { SystemPanelViewType } from '../../../../../src/utils/constants';
import * as extUtils from '../../../../../src/utils';
import * as panelUtils from '../../../../../src/panel/system/utils';
import * as uxStore from '@sap-ux/store';
import exp from 'constants';

jest.mock('../../../../../src/utils', () => ({
    ...jest.requireActual('../../../../../src/utils'),
    getBackendSystem: jest.fn(),
    saveSystem: jest.fn()
}));

jest.mock('../../../../../src/panel/system/utils', () => ({
    ...jest.requireActual('../../../../../src/panel/system/utils'),
    validateSystemName: jest.fn()
}));

const systemServiceWriteMock = jest.fn();
const systemServiceDeleteMock = jest.fn();

jest.mock('@sap-ux/store', () => ({
    getService: jest.fn().mockImplementation(() => ({
        write: systemServiceWriteMock,
        delete: systemServiceDeleteMock
    }))
}));

describe('Test Update System Action', () => {
    beforeAll(async () => {
        await initI18n();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    const backendSystem = {
        name: 'Test System',
        systemType: 'OnPrem',
        url: 'https://test-system.example.com',
        client: '100',
        username: 'testuser',
        password: 'password'
    };

    const postMessageMock = jest.fn();
    const disposePanelMock = jest.fn();
    const updateBackendSystemMock = jest.fn();
    const basePanelContext = {
        postMessage: postMessageMock,
        panelViewType: SystemPanelViewType.Update,
        backendSystem: backendSystem,
        disposePanel: disposePanelMock,
        updateBackendSystem: updateBackendSystemMock,
        isGuidedAnswersEnabled: false
    } as PanelContext;

    it('should create a new system without errors', async () => {
        jest.spyOn(panelUtils, 'validateSystemName').mockResolvedValue(true);
        jest.spyOn(extUtils, 'getBackendSystem').mockResolvedValue(undefined);
        systemServiceWriteMock.mockResolvedValue(backendSystem);
        const panelContext = { ...basePanelContext, panelViewType: SystemPanelViewType.Create };

        await expect(
            updateSystem(panelContext, { type: 'UPDATE_SYSTEM', payload: { system: backendSystem } })
        ).resolves.toBeUndefined();

        expect(disposePanelMock).toHaveBeenCalled();
        expect(postMessageMock).not.toHaveBeenCalled();
        expect(systemServiceWriteMock).toHaveBeenCalledWith(
            { ...backendSystem, userDisplayName: 'testuser' },
            { force: false }
        );
    });

    it('should add a new system without errors via import', async () => {
        jest.spyOn(panelUtils, 'validateSystemName').mockResolvedValue(true);
        jest.spyOn(extUtils, 'getBackendSystem').mockResolvedValue(undefined);
        systemServiceWriteMock.mockResolvedValue(backendSystem);
        const panelContext = { ...basePanelContext, panelViewType: SystemPanelViewType.Import };

        await expect(
            updateSystem(panelContext, {
                type: 'UPDATE_SYSTEM',
                payload: {
                    system: { ...backendSystem, systemType: undefined, username: undefined, password: undefined }
                }
            })
        ).resolves.toBeUndefined();

        expect(disposePanelMock).toHaveBeenCalled();
        expect(postMessageMock).not.toHaveBeenCalled();
        expect(systemServiceWriteMock).toHaveBeenCalledWith(
            { ...backendSystem, systemType: undefined, username: undefined, password: undefined },
            { force: false }
        );
    });

    it('should throw an error when a system already exists', async () => {
        jest.spyOn(panelUtils, 'validateSystemName').mockResolvedValue(true);
        jest.spyOn(extUtils, 'getBackendSystem').mockResolvedValue(backendSystem);
        systemServiceWriteMock.mockResolvedValue(backendSystem);
        const panelContext = { ...basePanelContext, panelViewType: SystemPanelViewType.Create };

        await expect(
            updateSystem(panelContext, { type: 'UPDATE_SYSTEM', payload: { system: backendSystem } })
        ).resolves.toBeUndefined();

        expect(postMessageMock).toHaveBeenCalledWith({
            type: 'UPDATE_SYSTEM_STATUS',
            payload: {
                message: 'Failed to update system information: System (URL + Client) already exists',
                updateSuccess: false
            }
        });
        expect(systemServiceWriteMock).not.toHaveBeenCalled();
    });

    it('should update an existing system without errors', async () => {
        jest.spyOn(panelUtils, 'validateSystemName').mockResolvedValue(true);
        jest.spyOn(extUtils, 'getBackendSystem').mockResolvedValue(backendSystem);
        systemServiceWriteMock.mockResolvedValue(backendSystem);
        const panelContext = { ...basePanelContext, panelViewType: SystemPanelViewType.View };

        await expect(
            updateSystem(panelContext, { type: 'UPDATE_SYSTEM', payload: { system: backendSystem } })
        ).resolves.toBeUndefined();

        expect(updateBackendSystemMock).toHaveBeenCalledWith(backendSystem);
        expect(postMessageMock).toHaveBeenCalledWith({
            type: 'UPDATE_SYSTEM_STATUS',
            payload: {
                message: 'System information updated.',
                updateSuccess: true
            }
        });
        expect(systemServiceWriteMock).toHaveBeenCalledWith(
            { ...backendSystem, userDisplayName: 'testuser' },
            { force: true }
        );
    });

    it('should throw an error when a system exists (and is not the correct panel)', async () => {
        jest.spyOn(panelUtils, 'validateSystemName').mockResolvedValue(true);
        jest.spyOn(extUtils, 'getBackendSystem').mockResolvedValue(backendSystem);
        systemServiceWriteMock.mockResolvedValue(backendSystem);
        const panelContext = { ...basePanelContext, panelViewType: SystemPanelViewType.View };

        await expect(
            updateSystem(panelContext, {
                type: 'UPDATE_SYSTEM',
                payload: { system: { ...backendSystem, url: 'https://new.url.com' } }
            })
        ).resolves.toBeUndefined();

        expect(postMessageMock).toHaveBeenCalledWith({
            type: 'UPDATE_SYSTEM_STATUS',
            payload: {
                message: 'Failed to update system information: System (URL + Client) already exists',
                updateSuccess: false
            }
        });
        expect(systemServiceWriteMock).not.toHaveBeenCalled();
    });

    it('should post an error message when validation fails', async () => {
        jest.spyOn(panelUtils, 'validateSystemName').mockRejectedValue(new Error('Validation Error'));
        const panelContext = { ...basePanelContext, panelViewType: SystemPanelViewType.View };

        await expect(
            updateSystem(panelContext, { type: 'UPDATE_SYSTEM', payload: { system: backendSystem } })
        ).resolves.toBeUndefined();

        expect(postMessageMock).toHaveBeenCalledWith({
            type: 'UPDATE_SYSTEM_STATUS',
            payload: {
                message: 'Failed to update system information: Validation Error',
                updateSuccess: false
            }
        });
        expect(systemServiceWriteMock).not.toHaveBeenCalled();
    });

    it('should save a system when a new system is created by updating an existing one', async () => {
        jest.spyOn(panelUtils, 'validateSystemName').mockResolvedValue(true);
        jest.spyOn(extUtils, 'getBackendSystem').mockResolvedValue(undefined);
        systemServiceWriteMock.mockResolvedValue(backendSystem);
        const panelContext = {
            ...basePanelContext,
            panelViewType: SystemPanelViewType.View,
            backendSystem: {
                name: 'Old System',
                systemType: 'OnPrem',
                url: 'https://old-system.example.com',
                client: '200',
                username: 'olduser',
                password: 'oldpassword'
            }
        };

        await expect(
            updateSystem(panelContext, { type: 'UPDATE_SYSTEM', payload: { system: backendSystem } })
        ).resolves.toBeUndefined();

        expect(disposePanelMock).toHaveBeenCalled();
        expect(systemServiceDeleteMock).toHaveBeenCalledWith(panelContext.backendSystem);
        expect(systemServiceWriteMock).toHaveBeenCalledWith(
            { ...backendSystem, userDisplayName: 'testuser' },
            { force: false }
        );
    });
});
