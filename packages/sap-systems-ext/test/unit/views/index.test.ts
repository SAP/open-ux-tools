import type { ExtensionContext } from 'vscode';
import { registerViews } from '../../../src/views';
import * as sapSystemsView from '../../../src/views/sapSystems';

jest.mock('../../../src/views/sapSystems');

describe('Test registration of the views', () => {
    it('should register the views without errors', () => {
        const initSapSystemsViewSpy = jest.spyOn(sapSystemsView, 'initSapSystemsView');

        const mockContext = {
            subscriptions: [],
            extensionPath: '/mock/extension/path'
        } as unknown as ExtensionContext;

        registerViews(mockContext);
        expect(initSapSystemsViewSpy).toHaveBeenCalledWith(mockContext);
    });
});
