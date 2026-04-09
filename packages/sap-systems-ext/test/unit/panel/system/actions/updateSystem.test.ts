import { jest } from '@jest/globals';
import type { PanelContext } from '../../../../../src/types';
import type { BackendSystem } from '@sap-ux/store';

const mockGetBackendSystem = jest.fn();
const mockSaveSystem = jest.fn();
const mockValidateSystemName = jest.fn();
const mockValidateSystemUrl = jest.fn();
const mockGetSystemInfo = jest.fn();

const systemServiceWriteMock = jest.fn();
const systemServiceDeleteMock = jest.fn();

// Mock @sap-ux/store FIRST so that modules imported later pick up the mock
const realStore = await import('@sap-ux/store');
jest.unstable_mockModule('@sap-ux/store', () => ({
    ...realStore,
    getService: jest.fn().mockImplementation(() => ({
        write: systemServiceWriteMock,
        delete: systemServiceDeleteMock
    }))
}));

const realUtils = await import('../../../../../src/utils');
jest.unstable_mockModule('../../../../../src/utils', () => ({
    ...realUtils,
    getBackendSystem: mockGetBackendSystem,
    saveSystem: mockSaveSystem
}));

const realPanelUtils = await import('../../../../../src/panel/system/utils');
jest.unstable_mockModule('../../../../../src/panel/system/utils', () => ({
    ...realPanelUtils,
    validateSystemName: mockValidateSystemName,
    validateSystemUrl: mockValidateSystemUrl,
    getSystemInfo: mockGetSystemInfo
}));

const { updateSystem } = await import('../../../../../src/panel/system/actions/updateSystem');
const { initI18n } = await import('../../../../../src/utils');
const { SystemPanelViewType } = await import('../../../../../src/utils/constants');

describe('Test Update System Action', () => {
    beforeAll(async () => {
        await initI18n();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    const backendSystem: BackendSystem = {
        name: 'Test System',
        systemType: 'OnPrem',
        url: 'https://test-system.example.com',
        client: '100',
        username: 'testuser',
        password: 'password',
        connectionType: 'abap_catalog',
        hasSensitiveData: true
    };

    const postMessageMock = jest.fn();
    const disposePanelMock = jest.fn();
    const updateBackendSystemMock = jest.fn();
    const basePanelContext = {
        postMessage: postMessageMock,
        panelViewType: SystemPanelViewType.View,
        backendSystem: backendSystem,
        disposePanel: disposePanelMock,
        updateBackendSystem: updateBackendSystemMock,
        isGuidedAnswersEnabled: false
    } as PanelContext;

    it('should create a new system without errors', async () => {
        mockValidateSystemName.mockResolvedValue(true);
        mockValidateSystemUrl.mockReturnValue(true);
        mockGetBackendSystem.mockResolvedValue(undefined);
        systemServiceWriteMock.mockResolvedValue(backendSystem);
        const panelContext = { ...basePanelContext, panelViewType: SystemPanelViewType.Create };

        await expect(
            updateSystem(panelContext, { type: 'UPDATE_SYSTEM', payload: { system: backendSystem } })
        ).resolves.toBeUndefined();

        expect(mockValidateSystemUrl).toHaveBeenCalledWith(backendSystem.url);
        expect(disposePanelMock).toHaveBeenCalled();
        expect(postMessageMock).not.toHaveBeenCalled();
        expect(systemServiceWriteMock).toHaveBeenCalledWith(
            { ...backendSystem, userDisplayName: 'testuser' },
            { force: false }
        );
    });

    it('should create a new system with system info', async () => {
        mockValidateSystemName.mockResolvedValue(true);
        mockValidateSystemUrl.mockReturnValue(true);
        mockGetBackendSystem.mockResolvedValue(undefined);
        mockGetSystemInfo.mockResolvedValue({ systemId: 'SYS123', client: '100' });
        systemServiceWriteMock.mockResolvedValue(backendSystem);
        const panelContext = { ...basePanelContext, panelViewType: SystemPanelViewType.Create };

        await expect(
            updateSystem(panelContext, { type: 'UPDATE_SYSTEM', payload: { system: backendSystem } })
        ).resolves.toBeUndefined();

        expect(disposePanelMock).toHaveBeenCalled();
        expect(postMessageMock).not.toHaveBeenCalled();
        expect(systemServiceWriteMock).toHaveBeenCalledWith(
            { ...backendSystem, userDisplayName: 'testuser', systemInfo: { systemId: 'SYS123', client: '100' } },
            { force: false }
        );
    });

    it('should still create a new system successfully if system info call returns undefined ', async () => {
        mockValidateSystemName.mockResolvedValue(true);
        mockValidateSystemUrl.mockReturnValue(true);
        mockGetBackendSystem.mockResolvedValue(undefined);
        mockGetSystemInfo.mockResolvedValue(undefined);
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
        mockValidateSystemName.mockResolvedValue(true);
        mockValidateSystemUrl.mockReturnValue(true);
        mockGetBackendSystem.mockResolvedValue(undefined);
        systemServiceWriteMock.mockResolvedValue(backendSystem);
        const panelContext = { ...basePanelContext, panelViewType: SystemPanelViewType.Import };

        await expect(
            updateSystem(panelContext, {
                type: 'UPDATE_SYSTEM',
                payload: {
                    system: { ...backendSystem, username: undefined, password: undefined }
                }
            })
        ).resolves.toBeUndefined();

        expect(disposePanelMock).toHaveBeenCalled();
        expect(postMessageMock).not.toHaveBeenCalled();
        expect(systemServiceWriteMock).toHaveBeenCalledWith(
            { ...backendSystem, username: undefined, password: undefined },
            { force: false }
        );
    });

    it('should throw an error when a system already exists', async () => {
        mockValidateSystemName.mockResolvedValue(true);
        mockValidateSystemUrl.mockReturnValue(true);
        mockGetBackendSystem.mockResolvedValue(backendSystem);
        systemServiceWriteMock.mockResolvedValue(backendSystem);
        const panelContext = { ...basePanelContext, panelViewType: SystemPanelViewType.Create };

        await expect(
            updateSystem(panelContext, { type: 'UPDATE_SYSTEM', payload: { system: backendSystem } })
        ).resolves.toBeUndefined();

        expect(postMessageMock).toHaveBeenCalledWith({
            type: 'UPDATE_SYSTEM_STATUS',
            payload: {
                message: 'Failed to create the connection information: Connection already exists',
                updateSuccess: false,
                existingSystem: {
                    name: backendSystem.name,
                    url: backendSystem.url,
                    client: backendSystem.client
                }
            }
        });
        expect(systemServiceWriteMock).not.toHaveBeenCalled();
    });

    it('should update an existing system without errors (should handle trailing slash)', async () => {
        mockValidateSystemName.mockResolvedValue(true);
        mockValidateSystemUrl.mockReturnValue(true);
        mockGetBackendSystem.mockResolvedValue(backendSystem);
        const systemInfo = { systemId: 'SYS123', client: '100' };
        mockGetSystemInfo.mockResolvedValue(systemInfo);
        systemServiceWriteMock.mockResolvedValue(backendSystem);

        const panelContext = {
            ...basePanelContext,
            backendSystem: { ...backendSystem, systemInfo },
            panelViewType: SystemPanelViewType.View
        };
        const backendUrlWithTrailingSlash = backendSystem.url + '/';
        await expect(
            updateSystem(panelContext, {
                type: 'UPDATE_SYSTEM',
                payload: { system: { ...backendSystem, url: backendUrlWithTrailingSlash } }
            })
        ).resolves.toBeUndefined();

        expect(mockValidateSystemUrl).toHaveBeenCalledWith(backendUrlWithTrailingSlash);
        expect(updateBackendSystemMock).toHaveBeenCalledWith({
            ...backendSystem,
            url: backendUrlWithTrailingSlash,
            systemInfo
        });
        expect(postMessageMock).toHaveBeenCalledWith({
            type: 'UPDATE_SYSTEM_STATUS',
            payload: {
                message: 'Connection information updated.',
                updateSuccess: true
            }
        });
        expect(systemServiceWriteMock).toHaveBeenCalledWith(
            { ...backendSystem, userDisplayName: 'testuser', url: backendUrlWithTrailingSlash, systemInfo },
            { force: true }
        );
    });

    it('should throw an error when a system exists (and is not the correct panel)', async () => {
        mockValidateSystemName.mockResolvedValue(true);
        mockValidateSystemUrl.mockReturnValue(true);
        mockGetBackendSystem.mockResolvedValue(backendSystem);
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
                message: 'Failed to update the connection information: Connection already exists',
                updateSuccess: false,
                existingSystem: {
                    name: backendSystem.name,
                    url: backendSystem.url,
                    client: backendSystem.client
                }
            }
        });
        expect(systemServiceWriteMock).not.toHaveBeenCalled();
    });

    it('should post an error message when validation fails', async () => {
        mockValidateSystemName.mockRejectedValue(new Error('Validation Error'));
        mockValidateSystemUrl.mockReturnValue(true);
        const panelContext = { ...basePanelContext, panelViewType: SystemPanelViewType.View };

        await expect(
            updateSystem(panelContext, { type: 'UPDATE_SYSTEM', payload: { system: backendSystem } })
        ).resolves.toBeUndefined();

        expect(postMessageMock).toHaveBeenCalledWith({
            type: 'UPDATE_SYSTEM_STATUS',
            payload: {
                message: 'Failed to update the connection information: Validation Error',
                updateSuccess: false
            }
        });
        expect(systemServiceWriteMock).not.toHaveBeenCalled();
    });

    it('should save a system when a new system is created by updating an existing one', async () => {
        mockValidateSystemName.mockResolvedValue(true);
        mockValidateSystemUrl.mockReturnValue(true);
        mockGetBackendSystem.mockResolvedValue(undefined);
        mockGetSystemInfo.mockResolvedValue(undefined);
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
                password: 'oldpassword',
                connectionType: 'abap_catalog'
            } as BackendSystem
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

    it('should create odata_service system without credentials (no system info retrieval)', async () => {
        const odataServiceSystem: BackendSystem = {
            name: 'OData Service System',
            systemType: 'OnPrem',
            url: 'https://service.example.com/sap/opu/odata/sap/SERVICE',
            connectionType: 'odata_service',
            hasSensitiveData: false
        };

        mockValidateSystemName.mockResolvedValue(true);
        mockValidateSystemUrl.mockReturnValue(true);
        mockGetBackendSystem.mockResolvedValue(undefined);
        systemServiceWriteMock.mockResolvedValue(odataServiceSystem);
        const panelContext = { ...basePanelContext, panelViewType: SystemPanelViewType.Create };

        await expect(
            updateSystem(panelContext, { type: 'UPDATE_SYSTEM', payload: { system: odataServiceSystem } })
        ).resolves.toBeUndefined();

        expect(mockGetSystemInfo).not.toHaveBeenCalled();
        expect(disposePanelMock).toHaveBeenCalled();
        expect(systemServiceWriteMock).toHaveBeenCalledWith(
            { ...odataServiceSystem, userDisplayName: undefined },
            { force: false }
        );
    });

    it('should fetch system info for odata_service with credentials', async () => {
        const odataServiceSystem: BackendSystem = {
            name: 'OData Service System',
            systemType: 'OnPrem',
            url: 'https://service.example.com/sap/opu/odata/sap/SERVICE',
            username: 'testuser',
            password: 'password',
            connectionType: 'odata_service',
            hasSensitiveData: true
        };

        mockValidateSystemName.mockResolvedValue(true);
        mockValidateSystemUrl.mockReturnValue(true);
        mockGetBackendSystem.mockResolvedValue(odataServiceSystem);
        mockGetSystemInfo.mockResolvedValue({ systemId: 'SYS_OD123', client: '' });
        systemServiceWriteMock.mockResolvedValue(odataServiceSystem);
        const panelContext = {
            ...basePanelContext,
            backendSystem: odataServiceSystem,
            panelViewType: SystemPanelViewType.View
        };

        await expect(
            updateSystem(panelContext, { type: 'UPDATE_SYSTEM', payload: { system: odataServiceSystem } })
        ).resolves.toBeUndefined();

        expect(updateBackendSystemMock).toHaveBeenCalledWith({
            ...odataServiceSystem,
            systemInfo: { systemId: 'SYS_OD123', client: '' }
        });
        expect(systemServiceWriteMock).toHaveBeenCalledWith(
            { ...odataServiceSystem, userDisplayName: 'testuser', systemInfo: { systemId: 'SYS_OD123', client: '' } },
            { force: true }
        );
    });

    it('should post an error message when URL validation fails', async () => {
        mockValidateSystemName.mockResolvedValue(true);
        mockValidateSystemUrl.mockImplementation(() => {
            throw new Error("The URL 'invalid url' provided is invalid");
        });
        mockGetBackendSystem.mockResolvedValue(undefined);
        const panelContext = { ...basePanelContext, panelViewType: SystemPanelViewType.Create };

        const invalidSystem = { ...backendSystem, url: 'invalid url', systemType: undefined };
        await expect(
            updateSystem(panelContext, {
                type: 'UPDATE_SYSTEM',
                payload: { system: invalidSystem as unknown as BackendSystem }
            })
        ).resolves.toBeUndefined();

        expect(mockValidateSystemUrl).toHaveBeenCalledWith('invalid url');
        expect(postMessageMock).toHaveBeenCalledWith({
            type: 'UPDATE_SYSTEM_STATUS',
            payload: {
                message: "Failed to create the connection information: The URL 'invalid url' provided is invalid",
                updateSuccess: false
            }
        });
        expect(systemServiceWriteMock).not.toHaveBeenCalled();
    });
});
