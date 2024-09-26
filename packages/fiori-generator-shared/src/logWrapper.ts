import type {
    getExtensionLoggerOpts,
    IVSCodeExtLogger,
    LogLevel,
    IChildLogger as ILogWrapper
} from '@vscode-logging/logger';
import { getExtensionLogger } from '@vscode-logging/logger';
import { format } from 'logform';
import type { Logger } from 'yeoman-environment';
import { t } from './i18n';
import { LOGGING_LEVEL_CONFIG_PROP } from './constants';

// Re-export so we dont need to add vscode-logging dependencies to all app gen sub-modules
export type { ILogWrapper };

/**
 * Empty Implementation of the Logger, this is not strictly necessary in app gen but
 * other modules consuming parts of app gen need a dummy implementation (logs to console)
 */
export const DefaultLogger: LogWrapper = {
    fatal: (msg: string) => {
        console.log(msg);
    },
    error: (msg: string) => {
        console.error(msg);
    },
    warn: (msg: string) => {
        console.warn(msg);
    },
    info: (msg: string) => {
        console.log(msg);
    },
    debug: (msg: string) => {
        console.log(msg);
    },
    trace: (msg: string) => {
        console.trace(msg);
    },
    getChildLogger: () => DefaultLogger,
    getLogLevel: () => 'off',
    log: function (): Logger | undefined {
        // Do nothing
        return undefined;
    }
};

const LOG_LEVEL_KEYS: Record<LogLevel, number> = {
    off: -1,
    fatal: 0,
    error: 1,
    warn: 2,
    info: 3,
    debug: 4,
    trace: 5
};

/**
 * Creates a CLI logger based on the IChildLogger interface. This means we can use the
 * same log functions for extension and cli logging. No files generated for CLI use currently.
 *
 * @param logLevel - defaults to off on cli
 * @param logName - name of the logger
 * @returns {ILogWrapper} - the logger
 */
export function createCLILogger(logLevel: LogLevel = 'off', logName: string): ILogWrapper {
    const extensionLoggerOpts: getExtensionLoggerOpts = {
        extName: logName,
        level: logLevel,
        logConsole: true
    };
    return getExtensionLogger(extensionLoggerOpts);
}

/**
 * Log to vscode extension logger and yeoman logger simultaneously.
 * This allows use of Application Wizard log config and log file use but still have a single output channel for
 * App Gen logging.
 */
export class LogWrapper implements ILogWrapper {
    private static _vscodeLogger: ILogWrapper;
    private static _yoLogger: Logger;
    private static _logLevel: LogLevel;

    private static consoleFormat = format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.printf((msgJson) => {
            return `[${msgJson.timestamp}] ${msgJson.level.toUpperCase()}: ${msgJson.message}`;
        })
    );

    /**
     *
     * @param logName
     * @param logLevel
     * @param yoLogger
     * @param extLogger
     * @param vscode
     */
    constructor(logName: string, logLevel: LogLevel, yoLogger: Logger, extLogger?: IVSCodeExtLogger, vscode?: any) {
        LogWrapper._yoLogger = yoLogger;
        if (extLogger) {
            LogWrapper._logLevel = vscode
                ? vscode.workspace.getConfiguration().get(LOGGING_LEVEL_CONFIG_PROP)
                : logLevel ?? 'info';
            LogWrapper._vscodeLogger = extLogger.getChildLogger({ label: logName });
        } else {
            LogWrapper._vscodeLogger = createCLILogger(logLevel, logName);
            LogWrapper._logLevel = logLevel === 'off' || !logLevel ? 'warn' : logLevel;
        }
        LogWrapper._vscodeLogger.debug(t('DEBUG_LOG_MSG_LOGGING_LEVEL_CONFIGURED', { logLevel: LogWrapper._logLevel }));
    }

    private static logAtLevel = (level: LogLevel, message: string, ...args: any[]) => {
        if (LogWrapper._vscodeLogger && level !== 'off') {
            LogWrapper._vscodeLogger[level](message, ...args);
        }

        if (LogWrapper._yoLogger) {
            if (LOG_LEVEL_KEYS[level] <= LOG_LEVEL_KEYS[LogWrapper._logLevel]) {
                LogWrapper._yoLogger(
                    (
                        LogWrapper.consoleFormat.transform({
                            level,
                            message
                        }) as any
                    )[Symbol.for('message')]
                );
            }
        } else {
            DefaultLogger.error('LogWrapper is not initialised');
        }
    };

    /**
     *
     * @param msg
     * @param {...any} args
     */
    fatal(msg: string, ...args: any[]): void {
        LogWrapper.logAtLevel('fatal', msg, ...args);
    }
    /**
     *
     * @param msg
     * @param {...any} args
     */
    error(msg: string, ...args: any[]): void {
        LogWrapper.logAtLevel('error', msg, ...args);
    }
    /**
     *
     * @param msg
     * @param {...any} args
     */
    warn(msg: string, ...args: any[]): void {
        LogWrapper.logAtLevel('warn', msg, ...args);
    }
    /**
     *
     * @param msg
     * @param {...any} args
     */
    info(msg: string, ...args: any[]): void {
        LogWrapper.logAtLevel('info', msg, ...args);
    }
    /**
     *
     * @param msg
     * @param {...any} args
     */
    debug(msg: string, ...args: any[]): void {
        LogWrapper.logAtLevel('debug', msg, ...args);
    }
    /**
     *
     * @param msg
     * @param {...any} args
     */
    trace(msg: string, ...args: any[]): void {
        LogWrapper.logAtLevel('trace', msg, ...args);
    }

    /**
     *
     * @param msg
     */
    public static log(msg: string): void {
        LogWrapper.logAtLevel('info', msg);
    }

    /**
     * Redefinition of environment log function will log everything at info.
     * This can be removed once we replace all this.log references in Generators.
     *
     * @param msg - message to log
     * @param args - additional arguments
     * @returns {Logger | undefined} - the logger
     */
    public log(msg: string, ...args: any[]): Logger | void {
        LogWrapper.logAtLevel('info', msg, ...args);
        // Not initialized so use DefaultLogger.
        if (LogWrapper._yoLogger) {
            return LogWrapper._yoLogger;
        }
        DefaultLogger.info(msg);
    }

    /**
     * Get the currently configured log level.
     *
     * @returns {LogLevel} The current log level.
     */
    public getLogLevel(): LogLevel {
        return LogWrapper._logLevel;
    }

    getChildLogger(/* opts: { label: string } */): ILogWrapper {
        throw new Error('Method not implemented.');
    }
}
