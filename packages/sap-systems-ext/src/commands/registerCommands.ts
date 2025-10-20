import { commands, type ExtensionContext } from 'vscode';
import { registerSystemCommands } from './system';
import SystemsLogger from '../utils/logger';

/**
 * Register all commands for the extension.
 *
 * @param context - the extension context
 */
export function registerCommands(context: ExtensionContext): void {
    registerExtensionCommands();
    registerSystemCommands(context);
}

/**
 * Registers extension-level commands.
 */
function registerExtensionCommands(): void {
    // Command to open the output channel for the SAP Systems extension
    commands.registerCommand('sap.ux.storedSystens.openOutputChannel', () => {
        SystemsLogger.show();
    });
}
