import type { WebAppActions } from '@sap-ux/sap-systems-ext-types';
import type { DisposeCallback } from '../../../types/system';
import { Uri, ViewColumn, window, type WebviewPanel } from 'vscode';
import { t } from '../../../utils';
import { basename, join } from 'node:path';
import normalizePath from 'normalize-path';
import fastGlob from 'fast-glob';
import SystemsLogger from '../../../utils/logger';

/**
 * Creates and returns a new webview panel for the system view.
 *
 * @param webappDirPath - the file system path to the webview resources
 * @param disposeCallback - callback to be invoked when the panel is disposed
 * @param onMessage - callback to handle messages received from the webview
 * @returns a promise that resolves to the created WebviewPanel.
 */
export async function createWebviewPanel(
    webappDirPath: string,
    disposeCallback?: DisposeCallback,
    onMessage?: (action: WebAppActions) => Promise<void>
): Promise<WebviewPanel> {
    const viewRootUri: Uri = Uri.file(webappDirPath);
    const webviewPanel = window.createWebviewPanel('sap.ux.tools.sapSystems.show', `SAP Systems`, ViewColumn.One, {
        enableCommandUris: true,
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [viewRootUri]
    });

    webviewPanel.webview.html = await getSystemPanelHtmlForWebview({
        webappDirPath,
        toWebviewUri: (uri) => webviewPanel.webview.asWebviewUri(uri)
    });

    // Attach message listener if provided
    if (onMessage) {
        webviewPanel.webview.onDidReceiveMessage((action) => {
            onMessage(action).catch((e) => {
                SystemsLogger.logger.error(t('error.systemInfo', { error: e }));
            });
        });
    }

    if (disposeCallback) {
        webviewPanel.onDidDispose(() => disposeCallback());
    }

    return webviewPanel;
}

/**
 * Returns the HTML content for the system panel webview.
 *
 * @param params - object containing the webapp directory path and a function to convert file URIs to webview URIs
 * @param params.webappDirPath - the file system path to the webview resources
 * @param params.toWebviewUri - function to convert a file URI to a webview URI
 * @returns a promise that resolves to the HTML content as a string
 */
async function getSystemPanelHtmlForWebview({
    webappDirPath,
    toWebviewUri
}: {
    webappDirPath: string;
    toWebviewUri: (fileUri: Uri) => Uri;
}): Promise<string> {
    const viewRootPath = join(webappDirPath);
    const viewRootUri = toWebviewUri(Uri.file(viewRootPath));

    const storeList: string[] = await fastGlob(
        [normalizePath(join(viewRootPath, 'store.*.js')), normalizePath(join(viewRootPath, 'store.js'))],
        {}
    );
    const storeCssList: string[] = await fastGlob(
        [normalizePath(join(viewRootPath, 'store.*.css')), normalizePath(join(viewRootPath, 'store.css'))],
        {}
    );
    const store = basename(storeList[0] || 'store.js');
    const storeCss = basename(storeCssList[0] || 'store.css');

    return `<!DOCTYPE html>
    <html lang="en" translate="no">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
            <title>SAP Systems</title>
            <base href="./">
            <link rel="stylesheet" type="text/css" href="${viewRootUri}/${storeCss}">
        </head>
        <body>
            <noscript>You need to enable JavaScript to run this app.</noscript>
            <div id="root"></div>
            <script src="${viewRootUri}/${store}"></script>
        </body>
    </html>
    `;
}
