import type { SystemPanelViewType } from '../../utils/constants';
import type { BackendSystem } from '@sap-ux/store';
import type { DisposeCallback, PanelContext } from '../../types/system';
import type { WebAppActions } from '@sap-ux/sap-systems-ext-types';
import { extensions, type WebviewPanel, type Disposable } from 'vscode';
import { join } from 'path';
import { createWebviewPanel } from './utils';
import { dispatchPanelAction } from './actions';
import { GUIDED_ANSWERS_EXTENSION_ID } from '@sap-ux/guided-answers-helper';
import i18next from 'i18next';
import SystemsLogger from '../../utils/logger';

/**
 * Class representing a system panel in the SAP Systems extension.
 */
export class SystemPanel implements Disposable {
    private panel?: WebviewPanel;
    private disposeCallback?: DisposeCallback;
    readonly extensionPath: string;
    readonly systemPanelViewType: SystemPanelViewType;
    readonly backendSystem?: BackendSystem;
    readonly systemStatusMessage?: string;
    readonly isGuidedAnswersEnabled: boolean = !!extensions.getExtension(GUIDED_ANSWERS_EXTENSION_ID);

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

    public async dispose(): Promise<void> {
        this.panel?.dispose();
    }

    public async reveal(): Promise<void> {
        if (!this.panel) {
            const webappDirPath = join(this.extensionPath, '..', 'webapp', 'dist');
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
            if (!this.panel) {
                // should not happen
                return;
            }
            const context: PanelContext = {
                panelViewType: this.systemPanelViewType,
                backendSystem: this.backendSystem,
                systemStatusMessage: this.systemStatusMessage,
                isGuidedAnswersEnabled: this.isGuidedAnswersEnabled,
                disposePanel: this.dispose.bind(this),
                postMessage: this.panel.webview.postMessage.bind(this.panel.webview)
            };
            await dispatchPanelAction(context, action);
        } catch (e) {
            SystemsLogger.logger.error(i18next.t('SYSTEM_INFO_ERROR', { error: (e as Error).message ?? String(e) }));
        }
    }
}
