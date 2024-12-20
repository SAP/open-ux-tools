import { DefaultLogger, LogWrapper, type ILogWrapper } from '@sap-ux/fiori-generator-shared';
import type { Logger } from 'yeoman-environment';
import type { IVSCodeExtLogger, LogLevel } from '@vscode-logging/logger';

/**
 * Static logger prevents passing of logger references through all functions, as this is a cross-cutting concern.
 */
export default class FlpGenLogger {
    private static _logger: ILogWrapper = DefaultLogger;

    /**
     * Get the logger.
     *
     * @returns the logger
     */
    public static get logger(): ILogWrapper {
        return FlpGenLogger._logger;
    }

    /**
     * Set the logger.
     *
     * @param value the logger to set
     */
    public static set logger(value: ILogWrapper) {
        FlpGenLogger._logger = value;
    }

    /**
     * Configures the vscode logger.
     *
     * @param vscLogger - the vscode logger
     * @param loggerName - the logger name
     * @param yoLogger - the yeoman logger
     * @param vscode - the vscode instance
     * @param logLevel - the log level
     */
    static configureLogging(
        vscLogger: IVSCodeExtLogger,
        loggerName: string,
        yoLogger: Logger,
        vscode?: unknown,
        logLevel?: LogLevel
    ): void {
        const logWrapper = new LogWrapper(loggerName, yoLogger, logLevel, vscLogger, vscode);
        FlpGenLogger.logger = logWrapper;
    }
}
