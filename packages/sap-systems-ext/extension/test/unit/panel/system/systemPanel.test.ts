import type { WebAppActions } from '@sap-ux/sap-systems-ext-types';
import { initI18n } from '../../../../src/utils';
import { SystemPanel } from '../../../../src/panel/system/sytemPanel';
import { SystemPanelViewType } from '../../../../src/utils/constants';
import * as vscodeMod from 'vscode';
import * as actions from '../../../../src/panel/system/actions';

describe('Test the system panel class', () => {
    beforeAll(async () => {
        await initI18n();
    });

    it('should create a new system panel instance', async () => {
        let emitter: (action: WebAppActions) => void = (action: WebAppActions) => {
            fail(
                `Function emitter should be reassigning with action handler, but was not. It was called with action ${action}`
            );
        };
        const disposeCallback = jest.fn();

        const panelMock = {
            dispose: disposeCallback,
            reveal: jest.fn(),
            onDidDispose: jest.fn(),
            webview: {
                onDidReceiveMessage: (handler: (action: WebAppActions) => void) => {
                    emitter = handler;
                },
                postMessage: jest.fn(),
                asWebviewUri: jest.fn()
            }
        } as unknown as vscodeMod.WebviewPanel;

        jest.spyOn(vscodeMod.window, 'createWebviewPanel').mockImplementation(() => {
            return panelMock;
        });

        jest.spyOn(vscodeMod.extensions, 'getExtension').mockReturnValue(undefined);

        const backendSystem = {
            url: 'https://example.com',
            client: '100',
            name: 'Test System',
            systemType: 'OnPrem'
        };
        const dispatchPanelActionSpy = jest.spyOn(actions, 'dispatchPanelAction');

        const panelContext = {
            extensionPath: '/mock/extension/path',
            systemPanelViewType: SystemPanelViewType.View,
            backendSystem,
            disposeCallback
        };

        const systemPanel = new SystemPanel(panelContext);
        expect(systemPanel).toBeDefined();

        await systemPanel.reveal();

        emitter({ type: 'WEBVIEW_READY' });
        expect(dispatchPanelActionSpy).toHaveBeenCalledWith(
            {
                panelViewType: panelContext.systemPanelViewType,
                backendSystem: panelContext.backendSystem,
                systemStatusMessage: undefined,
                isGuidedAnswersEnabled: false,
                disposePanel: expect.any(Function),
                postMessage: expect.any(Function)
            },
            { type: 'WEBVIEW_READY' }
        );

        dispatchPanelActionSpy.mockClear();
        dispatchPanelActionSpy.mockRejectedValueOnce(new Error('Dispatch failed'));
        emitter({ type: 'WEBVIEW_READY' });

        await systemPanel.dispose();
        expect(disposeCallback).toHaveBeenCalled();
    });
});
