import chalk from 'chalk';
import { ConsoleTransport, LogLevel, ToolsLogger } from '@sap-ux/logger';

const levelColor: { [level: string]: string } = {
    warn: 'yellow',
    error: 'red',
    verbose: 'blue',
    debug: 'gray'
};

let logger: ToolsLogger;

/**
 * Return the logger.
 *
 * @returns - Logger
 */
export function getLogger(): ToolsLogger {
    if (!logger) {
        logger = new ToolsLogger({
            transports: [new ConsoleTransport()],
            logPrefix: '',
            logLevel: process.env.DEBUG ? LogLevel.Debug : LogLevel.Info
        });
        setCustomFormatter(logger);
    }
    return logger;
}

/**
 * Set custom formatting to the logger. Needs better solution, perhaps proxy transport in @sap-ux/logger.
 *
 * @param logger - instance of the logger
 */
function setCustomFormatter(logger: ToolsLogger): void {
    const transports = (logger as any)?._logger?.transports;
    if (!Array.isArray(transports)) {
        return;
    }
    const consoleTransport = transports.find((t) => t?.name === 'console');
    if (consoleTransport?.format) {
        consoleTransport.format.transform = (info: any): any => {
            const colorFn = levelColor[info.level] ? chalk.keyword(levelColor[info.level]) : (m: string): string => m;
            const formattedMessage = colorFn ? colorFn(info.message) : info.message;
            const symbol = Object.getOwnPropertySymbols(info).find((s: any) => s?.description === 'message');
            if (symbol) {
                info[symbol] = formattedMessage;
            }
            return info;
        };
    }
}

/**
 * Initialize the logger with a certain log level.
 *
 * @param logLevel - see @sap-ux/logger -> LogLevel
 */
function updateLogLevel(logLevel: LogLevel): void {
    logger = new ToolsLogger({ logLevel, transports: [new ConsoleTransport()], logPrefix: '' });
}

/**
 * Set the log level to verbose (debug).
 */
export function setLogLevelVerbose(): void {
    updateLogLevel(LogLevel.Debug);
}
