import { ToolsLogger, type Logger } from '@sap-ux/logger';

/**
 * Static logger prevents passing of logger references through all functions, as this is a cross-cutting concern.
 */
export default class LoggerHelper {
    private static _logger: Logger = new ToolsLogger({ logPrefix: '@sap-ux/odata-service-inquirer' });

    public static get logger(): Logger {
        return LoggerHelper._logger;
    }

    public static set logger(value: Logger) {
        LoggerHelper._logger = value;
    }
}
