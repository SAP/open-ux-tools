import type { ExtensionContext } from 'vscode';
import { registerViews } from './views';
import { registerCommands } from './commands/registerCommands';
import SystemsLogger from './utils/logger';

/**
 * Runs when the extension is activated.
 *
 * @param context - the extension context
 */
export function activate(context: ExtensionContext): void {
    // wrap both in try catch and add a systems logger with error

    try {
        SystemsLogger.logger.info('registering commands');
        console.log('registering commands');
        registerCommands(context);
    } catch (e) {
        console.log('Error reg commands', e);
        SystemsLogger.logger.info('ERROR registering commands');
    }

    try {
        SystemsLogger.logger.info('registering views');

        registerViews(context);
        SystemsLogger.logger.info('finished views');
    } catch (e) {
        console.log('error reg views', e);
        SystemsLogger.logger.info('ERROR registering views');
    }
}

export function deactivate(): void {}
