import type { SapSystemsExtContext } from '../types';
import { initSapSystemsView } from './sapSystems';

/**
 * Register all views for the extension.
 *
 * @param context - the extension context
 */
export function registerViews(context: SapSystemsExtContext): void {
    // stored systems view
    initSapSystemsView(context);
}
