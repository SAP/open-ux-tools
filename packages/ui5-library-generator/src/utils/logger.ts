import { ToolsLogger, type Logger } from '@sap-ux/logger';

/**
 * Static logger prevents passing of logger references through all functions, as this is a cross-cutting concern.
 */
export default class ReuseLibGenLogger {
    private static _logger: Logger = new ToolsLogger({ logPrefix: '@sap-ux/abap-deploy-config-inquirer' });

    /**
     * Get the logger.
     *
     * @returns the logger
     */
    public static get logger(): Logger {
        return ReuseLibGenLogger._logger;
    }

    /**
     * Set the logger.
     *
     * @param value the logger to set
     */
    public static set logger(value: Logger) {
        ReuseLibGenLogger._logger = value;
    }
}
