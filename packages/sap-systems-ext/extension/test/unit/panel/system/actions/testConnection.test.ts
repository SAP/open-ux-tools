import type { PanelContext } from '../../../../../src/types';
import { testSystemConnection } from '../../../../../src/panel/system/actions/testConnection';
import * as validators from '../../../../../src/panel/system/utils/validate';
import * as catalog from '../../../../../src/panel/system/utils/catalog';

jest.mock('../../../../../src/panel/system/utils', () => ({
    ...jest.requireActual('../../../../../src/panel/system/utils'),
    validateSystemInfo: jest.fn(),
    getCatalogServiceCount: jest.fn()
}));

describe('Test Connection Action', () => {
    it('should post message to webview with service summary', async () => {
        jest.spyOn(validators, 'validateSystemInfo').mockReturnValue(true);
        jest.spyOn(catalog, 'getCatalogServiceCount').mockResolvedValue({
            v2Request: { count: 5, error: undefined },
            v4Request: { count: 3, error: undefined }
        });
        const postMessageMock = jest.fn();
        const panelContext = {
            postMessage: postMessageMock,
            isGuidedAnswersEnabled: false
        } as unknown as PanelContext;

        const backendSystem = {
            name: 'Test System',
            systemType: 'OnPrem',
            url: 'https://test-system.example.com',
            client: '100',
            username: 'testuser',
            password: 'password'
        };

        await testSystemConnection(panelContext, { type: 'TEST_CONNECTION', payload: { system: backendSystem } });

        expect(postMessageMock).toHaveBeenCalledWith(expect.objectContaining({ type: 'LOADING_TEST_CONNECTION_INFO' }));
        expect(postMessageMock).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'CONNECTION_STATUS',
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
});
