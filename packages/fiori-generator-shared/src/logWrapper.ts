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
    getLogLevel: () => 'off'
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
 * @param logName - name of the logger
 * @param logLevel - defaults to off on cli
 * @returns {ILogWrapper} - the logger
 */
export function createCLILogger(logName: string, logLevel: LogLevel = 'off'): ILogWrapper {
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

    static readonly consoleFormat = format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.printf((msgJson) => {
            return `[${msgJson.timestamp}] ${msgJson.level.toUpperCase()}: ${msgJson.message}`;
        })
    );

    /**
     * Create a new LogWrapper instance.
     *
     * @param logName - name of the logger
     * @param yoLogger - yeoman logger
     * @param logLevel - log level
     * @param extLogger - vscode extension logger
     * @param vscode - vscode instance
     */
    constructor(logName: string, yoLogger: Logger, logLevel?: LogLevel, extLogger?: IVSCodeExtLogger, vscode?: any) {
        LogWrapper._yoLogger = yoLogger;
        if (extLogger) {
            LogWrapper._logLevel = vscode
                ? vscode.workspace.getConfiguration().get(LOGGING_LEVEL_CONFIG_PROP)
                : logLevel ?? 'info';
            LogWrapper._vscodeLogger = extLogger.getChildLogger({ label: logName });
        } else {
            if (!yoLogger) {
                LogWrapper._vscodeLogger = createCLILogger(logName, logLevel);
            }
            LogWrapper._logLevel = logLevel === 'off' || !logLevel ? 'info' : logLevel;
        }
        LogWrapper._vscodeLogger?.debug(t('debug.loggingConfigured', { logLevel: LogWrapper._logLevel }));
    }

    static readonly logAtLevel = (level: LogLevel, message: string, ...args: any[]) => {
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
            DefaultLogger.error(t('error.logWrapperNotInitialised'));
        }
    };

    /**
     * Log a message at the fatal level.
     *
     * @param msg - message to log
     * @param {...any} args - additional arguments
     */
    fatal(msg: string, ...args: any[]): void {
        LogWrapper.logAtLevel('fatal', msg, ...args);
    }
    /**
     * Log a message at the error level.
     *
     * @param msg - message to log
     * @param {...any} args - additional arguments
     */
    error(msg: string, ...args: any[]): void {
        LogWrapper.logAtLevel('error', msg, ...args);
    }
    /**
     * Log a message at the warn level.
     *
     * @param msg - message to log
     * @param {...any} args - additional arguments
     */
    warn(msg: string, ...args: any[]): void {
        LogWrapper.logAtLevel('warn', msg, ...args);
    }
    /**
     * Log a message at the info level.
     *
     * @param msg - message to log
     * @param {...any} args - additional arguments
     */
    info(msg: string, ...args: any[]): void {
        LogWrapper.logAtLevel('info', msg, ...args);
    }
    /**
     * Log a message at the debug level.
     *
     * @param msg - message to log
     * @param {...any} args - additional arguments
     */
    debug(msg: string, ...args: any[]): void {
        LogWrapper.logAtLevel('debug', msg, ...args);
    }
    /**
     * Log a message at the trace level.
     *
     * @param msg - message to log
     * @param {...any} args - additional arguments
     */
    trace(msg: string, ...args: any[]): void {
        LogWrapper.logAtLevel('trace', msg, ...args);
    }

    /**
     * Log a message at the info level.
     *
     * @param msg - message to log
     */
    public static log(msg: string): void {
        LogWrapper.logAtLevel('info', msg);
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
        throw new Error(t('error.methodNotImplemented'));
    }
}
