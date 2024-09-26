import { DefaultLogger, LogWrapper, type ILogWrapper } from '@sap-ux/fiori-generator-shared';
import type { Logger } from 'yeoman-environment';
import type { IVSCodeExtLogger } from '@vscode-logging/logger';

/**
 * Static logger prevents passing of logger references through all functions, as this is a cross-cutting concern.
 */
export default class ReuseLibGenLogger {
    static logger: ILogWrapper = DefaultLogger;

    /**
     * Configures the vscode logger.
     *
     * @param vscLogger - the vscode logger
     * @param loggerName - the logger name
     * @param yoLogger - the yeoman logger
     * @param vscode - the vscode instance
     */
    static configureLogging(vscLogger: IVSCodeExtLogger, loggerName: string, yoLogger: Logger, vscode?: unknown): void {
        const logWrapper = new LogWrapper(loggerName, 'info', yoLogger, vscLogger, vscode);
        ReuseLibGenLogger.logger = logWrapper;
    }
}
