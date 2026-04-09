import { jest } from '@jest/globals';
import type { ExtensionContext } from 'vscode';

const mockInitSapSystemsView = jest.fn();

jest.unstable_mockModule('../../../src/views/sapSystems', () => ({
    initSapSystemsView: mockInitSapSystemsView
}));

const { registerViews } = await import('../../../src/views');

describe('Test registration of the views', () => {
    it('should register the views without errors', () => {
        const mockContext = {
            subscriptions: [],
            extensionPath: '/mock/extension/path'
        } as unknown as ExtensionContext;

        registerViews({ vscodeExtContext: mockContext });
        expect(mockInitSapSystemsView).toHaveBeenCalledWith({
            vscodeExtContext: mockContext
        });
    });
});
