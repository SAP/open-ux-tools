import type { SapSystemsExtContext } from '../types/index.js';
import { initSapSystemsView } from './sapSystems.js';

/**
 * Register all views for the extension.
 *
 * @param context - the extension context
 */
export function registerViews(context: SapSystemsExtContext): void {
    // stored systems view
    initSapSystemsView(context);
}
