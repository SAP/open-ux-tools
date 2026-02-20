import { commands, type ExtensionContext } from 'vscode';
import SystemsLogger from '../../utils/logger';

/**
 * Registers extension-level commands.
 *
 * @param context - the extension context
 */
export function registerExtensionCommands(context: ExtensionContext): void {
    const disposables = [
        // Command to open the output channel for the extension
        commands.registerCommand('sap.ux.tools.sapSystems.openOutputChannel', () => {
            SystemsLogger.show();
        })
    ];

    context.subscriptions.push(...disposables);
}
