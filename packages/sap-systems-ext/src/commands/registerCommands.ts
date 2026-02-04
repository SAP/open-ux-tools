import type { SapSystemsExtContext } from '../types';
import { registerSystemViewCommands } from './system';
import { registerExtensionCommands } from './extension';

/**
 * Register all commands for the extension.
 *
 * @param context - the extension context
 */
export function registerCommands(context: SapSystemsExtContext): void {
    registerExtensionCommands(context.vscodeExtContext);
    registerSystemViewCommands(context);
}
