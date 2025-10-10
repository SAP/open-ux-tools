import { ExtensionLogger } from '@sap-ux/logger';
import type { Logger } from '@sap-ux/logger';

/**
 * Logger utility for the SAP Systems extension.
 */
export default class SystemsLogger {
    private static _logger = new ExtensionLogger('Fiori tools - Stored Systems Extension');

    /**
     * Get the logger.
     *
     * @returns the logger
     */
    public static get logger(): Logger {
        return SystemsLogger._logger as Logger;
    }

    /**
     * Set the logger.
     *
     * @param value the logger to set
     */
    public static set logger(value: Logger) {
        SystemsLogger._logger = value as ExtensionLogger;
    }

    /**
     * Show the logger output channel.
     */
    public static show(): void {
        SystemsLogger._logger.show();
    }
}
