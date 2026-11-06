import { DefaultLogger, LogWrapper, type ILogWrapper } from '@sap-ux/fiori-generator-shared';
import type { IVSCodeExtLogger, LogLevel } from '@vscode-logging/logger';

/**
 * Minimal structural type for the Yeoman adapter logger. The full `Logger` type moved to
 * `@yeoman/types` in the v6/v8 stack; this file only forwards the logger to `LogWrapper`,
 * so a local type avoids a fragile transitive type dependency.
 */
type Logger = (message?: string) => void;

/**
 * Static logger prevents passing of logger references through all functions, as this is a cross-cutting concern.
 */
export default class ReferenceLibGenLogger {
    private static _logger: ILogWrapper = DefaultLogger;

    /**
     * Get the logger.
     *
     * @returns the logger
     */
    public static get logger(): ILogWrapper {
        return ReferenceLibGenLogger._logger;
    }

    /**
     * Set the logger.
     *
     * @param value the logger to set
     */
    public static set logger(value: ILogWrapper) {
        ReferenceLibGenLogger._logger = value;
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
        vscLogger: IVSCodeExtLogger | undefined,
        loggerName: string,
        yoLogger: Logger,
        vscode?: unknown,
        logLevel?: LogLevel
    ): void {
        const logWrapper = new LogWrapper(loggerName, yoLogger, logLevel, vscLogger, vscode);
        ReferenceLibGenLogger.logger = logWrapper;
    }
}
