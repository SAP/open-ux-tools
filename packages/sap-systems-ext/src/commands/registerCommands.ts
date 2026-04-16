import type { SapSystemsExtContext } from '../types/index.js';
import { registerSystemViewCommands } from './system/index.js';
import { registerExtensionCommands } from './extension/index.js';

/**
 * Register all commands for the extension.
 *
 * @param context - the extension context
 */
export function registerCommands(context: SapSystemsExtContext): void {
    registerExtensionCommands(context.vscodeExtContext);
    registerSystemViewCommands(context);
}
