import { ToolsLogger, LogLevel, NullTransport, FileTransport } from '@sap-ux/logger';
import { fioriToolsDirectory } from '@sap-ux/project-access';
import { join } from 'node:path';

/**
 * General logger settings
 */
const filename = join(fioriToolsDirectory, 'fiori-mcp-server.log');
const maxsize = 10 * 1024 * 1024; // 10 MB max per file
const maxFiles = 5; // Keep up to 5 log files

/**
 * @returns The current log level based on configuration sources
 */
function getLogLevel(): LogLevel | undefined {
    // Check multiple possible sources for the log level
    const globalLogLevel = (globalThis as Partial<{ LOG_LEVEL: string }>).LOG_LEVEL;
    const envLogLevel = process.env.LOG_LEVEL;
    const argsLogLevel = process.argv.find((arg) => arg.startsWith('--log-level='))?.split('=')[1];

    const logLevelString = globalLogLevel ?? envLogLevel ?? argsLogLevel;

    if (logLevelString) {
        const level = logLevelString.toUpperCase();
        switch (level) {
            case 'OFF':
                return undefined;
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
    logLevel: currentLogLevel ?? LogLevel.Error,
    transports:
        currentLogLevel !== undefined ? [new FileTransport({ filename, maxsize, maxFiles })] : [new NullTransport()],
    logPrefix: 'fiori-mcp'
});

/**
 * Specification module ("@sap/ux-specification") expects different logger interface, so we create a simple adapter here
 */
type MessageMetadataType = (object | string | number)[];
export const specificationLogger = {
    info: (message: string, ...meta: MessageMetadataType): void => {
        logger.info(`@sap/ux-specification: ${message}`);
        for (const item of meta) {
            logger.info(typeof item === 'number' ? item.toString() : item);
        }
    },
    warning: (message: string, ...meta: MessageMetadataType): void => {
        logger.warn(`@sap/ux-specification: ${message}`);
        for (const item of meta) {
            logger.warn(typeof item === 'number' ? item.toString() : item);
        }
    },
    error: (message: string, ...meta: MessageMetadataType): void => {
        logger.error(`@sap/ux-specification: ${message}`);
        for (const item of meta) {
            logger.error(typeof item === 'number' ? item.toString() : item);
        }
    },
    reset: (): void => {}
};
