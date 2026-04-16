import type { ExtensionContext } from 'vscode';
import type { SapSystemsExtContext } from './types/index.js';
import { registerViews } from './views/index.js';
import { registerCommands } from './commands/registerCommands.js';
import { initI18n, TelemetryHelper } from './utils/index.js';

/**
 * Runs when the extension is activated.
 *
 * @param context - the extension context
 */
export async function activate(context: ExtensionContext): Promise<void> {
    await initI18n();
    await TelemetryHelper.initTelemetrySettings();

    const extContext: SapSystemsExtContext = {
        vscodeExtContext: context
    };

    registerCommands(extContext);
    registerViews(extContext);
}

export function deactivate(): void {
    // do nothing
}
