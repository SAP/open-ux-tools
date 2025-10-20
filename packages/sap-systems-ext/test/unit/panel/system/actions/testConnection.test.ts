import type { PanelContext } from '../../../../../src/types';
import { testSystemConnection } from '../../../../../src/panel/system/actions/testConnection';
import * as utils from '../../../../../src/panel/system/utils';
import { initI18n } from '../../../../../src/utils';

jest.mock('../../../../../src/panel/system/utils', () => ({
    ...jest.requireActual('../../../../../src/panel/system/utils'),
    validateSystemInfo: jest.fn(),
    getCatalogServiceCount: jest.fn(),
    createGALink: jest.fn(),
    getErrorType: jest.fn()
}));

describe('Test Connection Action', () => {
    beforeAll(async () => {
        await initI18n();
    });

    const backendSystem = {
        name: 'Test System',
        systemType: 'OnPrem',
        url: 'https://test-system.example.com',
        client: '100',
        username: 'testuser',
        password: 'password'
    };

    it('should post message to webview with service summary', async () => {
        jest.spyOn(utils, 'validateSystemInfo').mockReturnValue(true);
        jest.spyOn(utils, 'getCatalogServiceCount').mockResolvedValue({
            v2Request: { count: 5, error: undefined },
            v4Request: { count: 3, error: undefined }
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
                        connected: true,
                        catalogResults: {
                            v2Request: { count: 5, error: undefined },
                            v4Request: { count: 3, error: undefined }
                        }
                    }
                }
            })
        );
    });

    it('should post message to webview with validation message', async () => {
        jest.spyOn(utils, 'validateSystemInfo').mockReturnValue('Invalid system');

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
                        message: 'Invalid system'
                    }
                }
            })
        );
    });

    it('should post message to webview with error messages', async () => {
        jest.spyOn(utils, 'validateSystemInfo').mockReturnValue(true);
        const error = {
            message: 'Connection error',
            code: 'CONN_ERR',
            response: { status: 500, data: 'Internal Server Error', cause: 'Server is down' }
        };
        jest.spyOn(utils, 'getCatalogServiceCount').mockResolvedValue({
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
                        message: 'This SAP system failed to return any services.'
                    },
                    guidedAnswerLink: undefined
                }
            })
        );
    });

    it('should post message to webview with generic error message', async () => {
        jest.spyOn(utils, 'validateSystemInfo').mockReturnValue(true);
        jest.spyOn(utils, 'getCatalogServiceCount').mockResolvedValue({
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
                        message: 'This SAP system failed to return any services.'
                    },
                    guidedAnswerLink: undefined
                }
            })
        );
    });

    it('should post message to webview with error messages containing guided answers link', async () => {
        jest.spyOn(utils, 'validateSystemInfo').mockReturnValue(true);
        const error = {
            message: 'Connection error',
            code: 'CONN_ERR',
            cause: 'Server is down',
            response: { status: 500, data: 'Internal Server Error' }
        };
        jest.spyOn(utils, 'getCatalogServiceCount').mockResolvedValue({
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
        jest.spyOn(utils, 'createGALink').mockReturnValue(gaLink);
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
                        message: 'This SAP system failed to return any services.'
                    },
                    guidedAnswerLink: gaLink
                }
            })
        );
    });
});
