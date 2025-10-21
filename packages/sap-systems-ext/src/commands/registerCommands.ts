import type { ExtensionContext } from 'vscode';
import { registerSystemViewCommands } from './system';
import { registerExtensionCommands } from './extension';

/**
 * Register all commands for the extension.
 *
 * @param context - the extension context
 */
export function registerCommands(context: ExtensionContext): void {
    registerExtensionCommands(context);
    registerSystemViewCommands(context);
}
