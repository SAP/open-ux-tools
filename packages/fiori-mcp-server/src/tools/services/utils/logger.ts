/**
 * Simple logging utility with configurable log levels
 */

export enum LogLevel {
    NONE = 0,
    ERROR = 1,
    WARN = 2,
    INFO = 3,
    DEBUG = 4
}

/**
 * @returns The current log level based on configuration sources
 */
function getLogLevel(): LogLevel {
    // Check multiple possible sources for the log level
    const globalLogLevel = (global as any).LOG_LEVEL;
    const envLogLevel = process.env.LOG_LEVEL;
    const argsLogLevel = process.argv.find((arg) => arg.startsWith('--log-level='))?.split('=')[1];

    const logLevelString = globalLogLevel || envLogLevel || argsLogLevel;

    if (logLevelString) {
        const level = logLevelString.toUpperCase();
        if (level in LogLevel && typeof LogLevel[level as keyof typeof LogLevel] === 'number') {
            return LogLevel[level as keyof typeof LogLevel] as LogLevel;
        }
    }

    // Default to NONE
    return LogLevel.NONE;
}

const currentLogLevel = getLogLevel();

export const logger = {
    log: (message: string, ...args: any[]) => {
        if (currentLogLevel >= LogLevel.DEBUG) {
            console.log(message, ...args);
        }
    },

    error: (message: string, ...args: any[]) => {
        if (currentLogLevel >= LogLevel.ERROR) {
            console.error(message, ...args);
        }
    },

    warn: (message: string, ...args: any[]) => {
        if (currentLogLevel >= LogLevel.WARN) {
            console.warn(message, ...args);
        }
    },

    info: (message: string, ...args: any[]) => {
        if (currentLogLevel >= LogLevel.INFO) {
            console.info(message, ...args);
        }
    }
};
