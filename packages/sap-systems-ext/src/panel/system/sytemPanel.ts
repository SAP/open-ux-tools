import type { SystemPanelViewType } from '../../utils/constants';
import type { BackendSystem } from '@sap-ux/store';
import type { DisposeCallback, PanelContext } from '../../types/system';
import type { WebAppActions } from '@sap-ux/sap-systems-ext-types';
import { extensions, type WebviewPanel, type Disposable } from 'vscode';
import { t } from '../../utils';
import { join, resolve } from 'node:path';
import { createWebviewPanel } from './utils';
import { dispatchPanelAction } from './actions';
import { GUIDED_ANSWERS_EXTENSION_ID } from '@sap-ux/guided-answers-helper';
import SystemsLogger from '../../utils/logger';

/**
 * Class representing a system panel in the SAP Systems extension.
 */
export class SystemPanel implements Disposable {
    private panel?: WebviewPanel;
    private backendSystem?: BackendSystem;
    readonly extensionPath: string;
    readonly systemPanelViewType: SystemPanelViewType;
    readonly systemStatusMessage?: string;
    readonly isGuidedAnswersEnabled: boolean = !!extensions.getExtension(GUIDED_ANSWERS_EXTENSION_ID);
    readonly disposeCallback?: DisposeCallback;

    constructor({
        extensionPath,
        systemPanelViewType,
        disposeCallback,
        backendSystem,
        systemStatusMessage
    }: {
        extensionPath: string;
        systemPanelViewType: SystemPanelViewType;
        disposeCallback: DisposeCallback;
        backendSystem?: BackendSystem;
        systemStatusMessage?: string;
    }) {
        this.extensionPath = extensionPath;
        this.systemPanelViewType = systemPanelViewType;
        this.disposeCallback = disposeCallback;
        this.backendSystem = backendSystem;
        this.systemStatusMessage = systemStatusMessage;
    }

    public dispose(): void {
        this.panel?.dispose();
    }

    public async reveal(): Promise<void> {
        if (!this.panel) {
            const webappDirPath = process.env.SS_WEBAPP_PATH
                ? resolve(this.extensionPath, process.env.SS_WEBAPP_PATH)
                : join(this.extensionPath, 'dist', 'webapp');

            this.panel = await createWebviewPanel(
                webappDirPath,
                this.disposeCallback?.bind(this),
                this.onWebviewMessage.bind(this)
            );
        }
        this.panel.reveal();
    }

    /**
     * Handles messages received from the webview.
     *
     * @param action - the action received from the webview
     */
    private async onWebviewMessage(action: WebAppActions): Promise<void> {
        try {
            if (this.panel) {
                const context: PanelContext = {
                    panelViewType: this.systemPanelViewType,
                    backendSystem: this.backendSystem,
                    systemStatusMessage: this.systemStatusMessage,
                    isGuidedAnswersEnabled: this.isGuidedAnswersEnabled,
                    updateBackendSystem: this.updateBackendSystem.bind(this),
                    disposePanel: this.dispose.bind(this),
                    postMessage: this.panel.webview.postMessage.bind(this.panel.webview)
                };
                await dispatchPanelAction(context, action);
            }
        } catch (e) {
            SystemsLogger.logger.error(t('error.panelActionDispatch', { error: (e as Error).message ?? String(e) }));
        }
    }

    /**
     * Update the backend system in the panel context.
     *
     * @param system - backend system
     */
    private updateBackendSystem(system: BackendSystem): void {
        this.backendSystem = system;
    }
}
