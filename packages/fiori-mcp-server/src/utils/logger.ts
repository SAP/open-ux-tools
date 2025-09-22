import { ToolsLogger, LogLevel, ConsoleTransport } from '@sap-ux/logger';

/**
 * @returns The current log level based on configuration sources
 */
function getLogLevel(): LogLevel {
    // Check multiple possible sources for the log level
    const globalLogLevel = (globalThis as any).LOG_LEVEL;
    const envLogLevel = process.env.LOG_LEVEL;
    const argsLogLevel = process.argv.find((arg) => arg.startsWith('--log-level='))?.split('=')[1];

    const logLevelString = globalLogLevel || envLogLevel || argsLogLevel;

    if (logLevelString) {
        const level = logLevelString.toUpperCase();
        switch (level) {
            case 'ERROR':
                return LogLevel.Error;
            case 'WARN':
                return LogLevel.Warn;
            case 'INFO':
                return LogLevel.Info;
            case 'DEBUG':
                return LogLevel.Debug;
            case 'VERBOSE':
                return LogLevel.Verbose;
            case 'SILLY':
                return LogLevel.Silly;
            default:
                break;
        }
    }

    // Default to Error (minimal logging)
    return LogLevel.Error;
}

const currentLogLevel = getLogLevel();

// Create a global logger instance to be reused throughout the tool
export const logger = new ToolsLogger({
    logLevel: currentLogLevel,
    transports: [new ConsoleTransport()],
    logPrefix: 'fiori-mcp'
});
