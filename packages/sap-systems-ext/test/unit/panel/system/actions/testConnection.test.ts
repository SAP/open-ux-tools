import { jest } from '@jest/globals';
import type { PanelContext } from '../../../../../src/types';

const mockValidateSystemInfo = jest.fn();
const mockGetCatalogServiceCount = jest.fn();
const mockCreateGALink = jest.fn();
const mockGetErrorType = jest.fn();
const mockGetSystemInfo = jest.fn();
const mockHasServiceMetadata = jest.fn();

const systemServicePartialUpdateMock = jest.fn();

// Mock @sap-ux/store FIRST so that modules imported later pick up the mock
const realStore = await import('@sap-ux/store');
jest.unstable_mockModule('@sap-ux/store', () => ({
    ...realStore,
    getService: jest.fn().mockImplementation(() => ({
        partialUpdate: systemServicePartialUpdateMock
    }))
}));

const realPanelUtils = await import('../../../../../src/panel/system/utils');
jest.unstable_mockModule('../../../../../src/panel/system/utils', () => ({
    ...realPanelUtils,
    validateSystemInfo: mockValidateSystemInfo,
    getCatalogServiceCount: mockGetCatalogServiceCount,
    createGALink: mockCreateGALink,
    getErrorType: mockGetErrorType,
    getSystemInfo: mockGetSystemInfo,
    hasServiceMetadata: mockHasServiceMetadata
}));

const { testSystemConnection } = await import('../../../../../src/panel/system/actions/testConnection');
const { initI18n } = await import('../../../../../src/utils');
const { SystemPanelViewType } = await import('../../../../../src/utils/constants');
const { BackendSystem } = await import('@sap-ux/store');

describe('Test Connection Action', () => {
    beforeAll(async () => {
        await initI18n();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    const backendSystem = new BackendSystem({
        name: 'Test System',
        systemType: 'OnPrem',
        url: 'https://test-system.example.com',
        client: '100',
        username: 'testuser',
        password: 'password',
        connectionType: 'abap_catalog'
    });

    it('should post message to webview with service summary', async () => {
        mockValidateSystemInfo.mockReturnValue(true);
        mockGetCatalogServiceCount.mockResolvedValue({
            v2Request: { count: 5, error: undefined },
            v4Request: { count: 3, error: undefined }
        });
        const postMessageMock = jest.fn();
        const panelContext = {
            postMessage: postMessageMock,
            isGuidedAnswersEnabled: false,
            panelViewType: SystemPanelViewType.View,
            updateBackendSystem: jest.fn(),
            disposePanel: jest.fn(),
            backendSystem: {
                ...backendSystem,
                systemInfo: {
                    systemId: 'SYS_ID_001',
                    client: '100'
                }
            }
        } as PanelContext;

        await testSystemConnection(panelContext, { type: 'TEST_CONNECTION', payload: { system: backendSystem } });

        expect(postMessageMock).toHaveBeenCalledWith(expect.objectContaining({ type: 'TEST_CONNECTION_LOADING' }));
        expect(postMessageMock).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'TEST_CONNECTION_STATUS',
                payload: {
                    connectionStatus: {
                        connected: true,
                        catalogResults: {
                            v2Request: { count: 5, error: undefined },
                            v4Request: { count: 3, error: undefined }
                        },
                        showOutputChannelLink: true
                    }
                }
            })
        );
    });

    it('should post message to webview with validation message', async () => {
        mockValidateSystemInfo.mockReturnValue('Invalid system');

        const postMessageMock = jest.fn();
        const panelContext = {
            postMessage: postMessageMock,
            isGuidedAnswersEnabled: false
        } as unknown as PanelContext;

        await testSystemConnection(panelContext, { type: 'TEST_CONNECTION', payload: { system: backendSystem } });

        expect(postMessageMock).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'TEST_CONNECTION_STATUS',
                payload: {
                    connectionStatus: {
                        connected: false,
                        message: 'Invalid system',
                        showOutputChannelLink: false
                    }
                }
            })
        );
    });

    it('should post message to webview with error messages', async () => {
        mockValidateSystemInfo.mockReturnValue(true);
        const error = {
            message: 'Connection error',
            code: 'CONN_ERR',
            response: { status: 500, data: 'Internal Server Error', cause: 'Server is down' }
        };
        mockGetCatalogServiceCount.mockResolvedValue({
            v2Request: {
                count: undefined,
                error
            },
            v4Request: { count: undefined, error }
        });
        const postMessageMock = jest.fn();
        const panelContext = {
            postMessage: postMessageMock,
            isGuidedAnswersEnabled: false
        } as unknown as PanelContext;

        await testSystemConnection(panelContext, { type: 'TEST_CONNECTION', payload: { system: backendSystem } });

        expect(postMessageMock).toHaveBeenCalledWith(expect.objectContaining({ type: 'TEST_CONNECTION_LOADING' }));
        expect(postMessageMock).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'TEST_CONNECTION_STATUS',
                payload: {
                    connectionStatus: {
                        catalogResults: undefined,
                        connected: false,
                        message: 'This SAP system failed to return any services.',
                        showOutputChannelLink: true
                    },
                    guidedAnswerLink: undefined
                }
            })
        );
    });

    it('should post message to webview with generic error message', async () => {
        mockValidateSystemInfo.mockReturnValue(true);
        mockGetCatalogServiceCount.mockResolvedValue({
            v2Request: {
                count: undefined,
                error: undefined
            },
            v4Request: { count: undefined, error: undefined }
        });
        const postMessageMock = jest.fn();
        const panelContext = {
            postMessage: postMessageMock,
            isGuidedAnswersEnabled: false
        } as unknown as PanelContext;

        await testSystemConnection(panelContext, { type: 'TEST_CONNECTION', payload: { system: backendSystem } });

        expect(postMessageMock).toHaveBeenCalledWith(expect.objectContaining({ type: 'TEST_CONNECTION_LOADING' }));
        expect(postMessageMock).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'TEST_CONNECTION_STATUS',
                payload: {
                    connectionStatus: {
                        catalogResults: undefined,
                        connected: false,
                        message: 'This SAP system failed to return any services.',
                        showOutputChannelLink: true
                    },
                    guidedAnswerLink: undefined
                }
            })
        );
    });

    it('should post message to webview with error messages containing guided answers link', async () => {
        mockValidateSystemInfo.mockReturnValue(true);
        const error: any = {
            message: 'Connection error',
            code: 'CONN_ERR',
            response: { status: 500 }
        };
        error.response.data = { error: 'Internal Server Error' };
        error.response.data.circular = error.response.data;

        mockGetCatalogServiceCount.mockResolvedValue({
            v2Request: {
                count: undefined,
                error
            },
            v4Request: { count: undefined, error }
        });
        const gaLink = {
            linkText: 'Help with self-signed certificates',
            url: 'https://example.com/self-signed-cert-help',
            subText: 'Click here for more information on self-signed certificates.'
        };
        mockCreateGALink.mockReturnValue(gaLink);
        const postMessageMock = jest.fn();
        const panelContext = {
            postMessage: postMessageMock,
            isGuidedAnswersEnabled: false
        } as unknown as PanelContext;

        await testSystemConnection(panelContext, { type: 'TEST_CONNECTION', payload: { system: backendSystem } });

        expect(postMessageMock).toHaveBeenCalledWith(expect.objectContaining({ type: 'TEST_CONNECTION_LOADING' }));
        expect(postMessageMock).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'TEST_CONNECTION_STATUS',
                payload: {
                    connectionStatus: {
                        catalogResults: undefined,
                        connected: false,
                        message: 'This SAP system failed to return any services.',
                        showOutputChannelLink: true
                    },
                    guidedAnswerLink: gaLink
                }
            })
        );
    });

    it('should store system ID after testing connection', async () => {
        mockValidateSystemInfo.mockReturnValue(true);
        mockGetCatalogServiceCount.mockResolvedValue({
            v2Request: { count: 2, error: undefined },
            v4Request: { count: 1, error: undefined }
        });
        mockGetSystemInfo.mockResolvedValue({ systemId: 'SYS_ID_123', client: '100' });

        const panelContext = {
            postMessage: jest.fn(),
            isGuidedAnswersEnabled: false,
            panelViewType: SystemPanelViewType.View,
            updateBackendSystem: jest.fn(),
            disposePanel: jest.fn(),
            backendSystem: backendSystem
        } as PanelContext;

        await testSystemConnection(panelContext, { type: 'TEST_CONNECTION', payload: { system: backendSystem } });

        expect(systemServicePartialUpdateMock).toHaveBeenCalledWith(
            { url: backendSystem.url, client: backendSystem.client },
            {
                systemInfo: { systemId: 'SYS_ID_123', client: '100' }
            }
        );
    });

    it('should not attempt partial update if system ID is not defined', async () => {
        mockValidateSystemInfo.mockReturnValue(true);
        mockGetCatalogServiceCount.mockResolvedValue({
            v2Request: { count: 2, error: undefined },
            v4Request: { count: 1, error: undefined }
        });
        mockGetSystemInfo.mockResolvedValue(undefined);

        const panelContext = {
            postMessage: jest.fn(),
            isGuidedAnswersEnabled: false,
            panelViewType: SystemPanelViewType.View,
            updateBackendSystem: jest.fn(),
            disposePanel: jest.fn(),
            backendSystem: backendSystem
        } as PanelContext;

        await testSystemConnection(panelContext, { type: 'TEST_CONNECTION', payload: { system: backendSystem } });

        expect(systemServicePartialUpdateMock).not.toHaveBeenCalled();
    });

    it('should fail silently if updating system ID fails', async () => {
        mockValidateSystemInfo.mockReturnValue(true);
        mockGetCatalogServiceCount.mockResolvedValue({
            v2Request: { count: 2, error: undefined },
            v4Request: { count: 1, error: undefined }
        });
        mockGetSystemInfo.mockResolvedValue({ systemId: 'SYS_ID_123', client: '100' });
        systemServicePartialUpdateMock.mockRejectedValueOnce(new Error('Update failed'));
        const panelContext = {
            postMessage: jest.fn(),
            isGuidedAnswersEnabled: false,
            panelViewType: SystemPanelViewType.View,
            updateBackendSystem: jest.fn(),
            disposePanel: jest.fn(),
            backendSystem: backendSystem
        } as PanelContext;

        await expect(
            testSystemConnection(panelContext, { type: 'TEST_CONNECTION', payload: { system: backendSystem } })
        ).resolves.not.toThrow();
    });

    it('should test odata_service connection type successfully', async () => {
        const odataServiceSystem = new BackendSystem({
            name: 'OData Service System',
            systemType: 'OnPrem',
            url: 'https://test-system.example.com/sap/opu/odata/sap/SERVICE',
            username: 'testuser',
            password: 'password',
            connectionType: 'odata_service'
        });

        mockValidateSystemInfo.mockReturnValue(true);
        mockHasServiceMetadata.mockResolvedValue(true);

        const postMessageMock = jest.fn();
        const panelContext = {
            postMessage: postMessageMock,
            isGuidedAnswersEnabled: false,
            panelViewType: SystemPanelViewType.View,
            updateBackendSystem: jest.fn(),
            disposePanel: jest.fn()
        } as unknown as PanelContext;

        await testSystemConnection(panelContext, {
            type: 'TEST_CONNECTION',
            payload: { system: odataServiceSystem }
        });

        expect(mockHasServiceMetadata).toHaveBeenCalledWith(odataServiceSystem, undefined);
        expect(postMessageMock).toHaveBeenCalledWith(expect.objectContaining({ type: 'TEST_CONNECTION_LOADING' }));
        expect(postMessageMock).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'TEST_CONNECTION_STATUS',
                payload: {
                    connectionStatus: {
                        connected: true,
                        message: 'Service metadata retrieved successfully.',
                        showOutputChannelLink: true
                    }
                }
            })
        );
    });

    it('should handle odata_service connection failure', async () => {
        const odataServiceSystem = new BackendSystem({
            name: 'OData Service System',
            systemType: 'OnPrem',
            url: 'https://test-system.example.com/sap/opu/odata/sap/SERVICE',
            username: 'testuser',
            password: 'password',
            connectionType: 'odata_service'
        });

        mockValidateSystemInfo.mockReturnValue(true);
        mockHasServiceMetadata.mockRejectedValue(new Error('Metadata not found'));

        const postMessageMock = jest.fn();
        const panelContext = {
            postMessage: postMessageMock,
            isGuidedAnswersEnabled: false,
            panelViewType: SystemPanelViewType.View,
            updateBackendSystem: jest.fn(),
            disposePanel: jest.fn()
        } as unknown as PanelContext;

        await testSystemConnection(panelContext, {
            type: 'TEST_CONNECTION',
            payload: { system: odataServiceSystem }
        });

        expect(mockHasServiceMetadata).toHaveBeenCalledWith(odataServiceSystem, undefined);
        expect(postMessageMock).toHaveBeenCalledWith(expect.objectContaining({ type: 'TEST_CONNECTION_LOADING' }));
        expect(postMessageMock).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'TEST_CONNECTION_STATUS',
                payload: {
                    connectionStatus: {
                        connected: false,
                        message: 'Service metadata not available.',
                        showOutputChannelLink: true
                    }
                }
            })
        );
    });

    it('should test generic_host connection with servicePath successfully', async () => {
        const genericHostSystem = new BackendSystem({
            name: 'Generic Host System',
            systemType: 'OnPrem',
            url: 'https://test-system.example.com',
            username: 'testuser',
            password: 'password',
            connectionType: 'generic_host'
        });

        mockValidateSystemInfo.mockReturnValue(true);
        mockHasServiceMetadata.mockResolvedValue(true);

        const postMessageMock = jest.fn();
        const panelContext = {
            postMessage: postMessageMock,
            isGuidedAnswersEnabled: false,
            panelViewType: SystemPanelViewType.View,
            updateBackendSystem: jest.fn(),
            disposePanel: jest.fn()
        } as unknown as PanelContext;

        await testSystemConnection(panelContext, {
            type: 'TEST_CONNECTION',
            payload: { system: genericHostSystem, servicePath: '/sap/opu/odata/sap/MY_SERVICE' }
        });

        expect(mockHasServiceMetadata).toHaveBeenCalledWith(genericHostSystem, '/sap/opu/odata/sap/MY_SERVICE');
        expect(postMessageMock).toHaveBeenCalledWith(expect.objectContaining({ type: 'TEST_CONNECTION_LOADING' }));
        expect(postMessageMock).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'TEST_CONNECTION_STATUS',
                payload: {
                    connectionStatus: {
                        connected: true,
                        message: 'Service metadata retrieved successfully.',
                        showOutputChannelLink: true
                    }
                }
            })
        );
    });

    it('should handle generic_host connection with servicePath failure', async () => {
        const genericHostSystem = new BackendSystem({
            name: 'Generic Host System',
            systemType: 'OnPrem',
            url: 'https://test-system.example.com',
            username: 'testuser',
            password: 'password',
            connectionType: 'generic_host'
        });

        mockValidateSystemInfo.mockReturnValue(true);
        mockHasServiceMetadata.mockRejectedValue(new Error('Metadata not found'));

        const postMessageMock = jest.fn();
        const panelContext = {
            postMessage: postMessageMock,
            isGuidedAnswersEnabled: false,
            panelViewType: SystemPanelViewType.View,
            updateBackendSystem: jest.fn(),
            disposePanel: jest.fn()
        } as unknown as PanelContext;

        await testSystemConnection(panelContext, {
            type: 'TEST_CONNECTION',
            payload: { system: genericHostSystem, servicePath: '/sap/opu/odata/sap/MY_SERVICE' }
        });

        expect(mockHasServiceMetadata).toHaveBeenCalledWith(genericHostSystem, '/sap/opu/odata/sap/MY_SERVICE');
        expect(postMessageMock).toHaveBeenCalledWith(expect.objectContaining({ type: 'TEST_CONNECTION_LOADING' }));
        expect(postMessageMock).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'TEST_CONNECTION_STATUS',
                payload: {
                    connectionStatus: {
                        connected: false,
                        message: 'Service metadata not available.',
                        showOutputChannelLink: true
                    }
                }
            })
        );
    });
});
