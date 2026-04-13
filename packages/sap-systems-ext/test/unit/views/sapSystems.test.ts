import { jest } from '@jest/globals';
import type { ExtensionContext } from 'vscode';
import * as vscode from 'vscode';

const mockClose = jest.fn();
const realStore = await import('@sap-ux/store');

jest.unstable_mockModule('@sap-ux/store', () => ({
    ...realStore,
    getFilesystemWatcherFor: jest.fn().mockReturnValue({
        close: mockClose
    })
}));

const { initSapSystemsView } = await import('../../../src/views/sapSystems');

describe('Test the SAP Systems view', () => {
    it('should initialize the view without errors', () => {
        const registerTreeDataProviderSpy = jest.spyOn(vscode.window, 'registerTreeDataProvider').mockImplementation();
        const mockContext = {
            subscriptions: [],
            extensionPath: '/mock/extension/path'
        } as unknown as ExtensionContext;

        initSapSystemsView({ vscodeExtContext: mockContext });

        expect(registerTreeDataProviderSpy).toHaveBeenCalledWith('sap.ux.tools.sapSystems', expect.any(Object));
        expect(mockContext.subscriptions.length).toBe(2);
    });
});
