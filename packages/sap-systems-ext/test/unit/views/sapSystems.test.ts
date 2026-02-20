import type { ExtensionContext } from 'vscode';
import { initSapSystemsView } from '../../../src/views/sapSystems';
import * as vscode from 'vscode';

jest.mock('@sap-ux/store', () => ({
    ...jest.requireActual('@sap-ux/store'),
    getFilesystemWatcherFor: jest.fn().mockReturnValue({
        close: jest.fn()
    })
}));

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
