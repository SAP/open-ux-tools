import type { ExtensionContext } from 'vscode';
import { registerViews } from './views';
import { registerCommands } from './commands/registerCommands';

/**
 * Runs when the extension is activated.
 *
 * @param context - the extension context
 */
export function activate(context: ExtensionContext): void {
    registerCommands(context);
    registerViews(context);
}

export function deactivate(): void {}
