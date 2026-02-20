import type { FSWatcher } from 'node:fs';
import type { SapSystemsExtContext } from '../types';
import { window } from 'vscode';
import { SapSystemsProvider } from '../providers';
import { Entity, getFilesystemWatcherFor, getSapToolsDirectory } from '@sap-ux/store';

/**
 * Initializes the SAP Systems view in the VS Code sidebar.
 *
 * @param context - the extension context
 */
export function initSapSystemsView(context: SapSystemsExtContext): void {
    const systemsTreeDataProvider = new SapSystemsProvider(context.vscodeExtContext);
    context.vscodeExtContext.subscriptions.push(
        window.registerTreeDataProvider('sap.ux.tools.sapSystems', systemsTreeDataProvider)
    );
    context.systemsTreeDataProvider = systemsTreeDataProvider;

    const storeWatcher: FSWatcher | undefined = getFilesystemWatcherFor(
        Entity.BackendSystem,
        () => systemsTreeDataProvider.refresh(),
        { baseDirectory: getSapToolsDirectory() }
    );
    if (storeWatcher) {
        context.vscodeExtContext.subscriptions.push({ dispose: () => storeWatcher.close() });
    }
}
