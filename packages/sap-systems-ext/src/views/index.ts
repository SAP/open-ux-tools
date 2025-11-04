import type { ExtensionContext } from 'vscode';
import { initSapSystemsView } from './sapSystems';

/**
 * Register all views for the extension.
 *
 * @param context - the extension context
 */
export function registerViews(context: ExtensionContext): void {
    // stored systems view
    initSapSystemsView(context);
}
