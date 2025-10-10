import type { FSWatcher } from 'fs';
import { window, type ExtensionContext } from 'vscode';
import { SapSystemsProvider } from '../providers';
import { Entity, getFilesystemWatcherFor } from '@sap-ux/store';

/**
 * Initializes the SAP Systems view in the VS Code sidebar.
 *
 * @param context - the extension context
 */
export function initSapSystemsView(context: ExtensionContext): void {
    const systemsTreeDataProvider = new SapSystemsProvider(context);
    window.registerTreeDataProvider('sap.ux.tools.sapSystems', systemsTreeDataProvider);

    const storeWatcher: FSWatcher | undefined = getFilesystemWatcherFor(Entity.BackendSystem, () =>
        systemsTreeDataProvider.refresh()
    );
    if (storeWatcher) {
        context.subscriptions.push({ dispose: () => storeWatcher.close() });
    }
}
