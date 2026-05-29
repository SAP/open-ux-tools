import { ExtensionLogger } from '@sap-ux/logger';
import type { Logger } from '@sap-ux/logger';

/**
 * Logger utility for the extension.
 */
export default class SystemsLogger {
    private static _logger: Logger = new ExtensionLogger('Connection Manager for SAP Systems');

    /**
     * Get the logger.
     *
     * @returns the logger
     */
    public static get logger(): Logger {
        return SystemsLogger._logger;
    }

    /**
     * Set the logger.
     *
     * @param value the logger to set
     */
    public static set logger(value: Logger) {
        SystemsLogger._logger = value;
    }

    /**
     * Show the logger output channel.
     */
    public static show(): void {
        if (SystemsLogger._logger instanceof ExtensionLogger) {
            SystemsLogger._logger.show();
        }
    }
}
