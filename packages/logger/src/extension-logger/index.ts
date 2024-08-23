import { VSCodeTransport } from '../transports';
import { VSCodeTransport as WinstonVSCodeTransport } from '../winston-logger/vscode-output-channel-transport';
import { WinstonLogger } from '../winston-logger';
import { LogLevel } from '../types';
import { toWinstonLogLevel } from '../winston-logger/adapter';

export class ExtensionLogger extends WinstonLogger {
    constructor(channelName: string) {
        const vscodeTransport = new VSCodeTransport({ channelName });
        super({
            logLevel: LogLevel.Silly, // set to lowest level, let VSCode filter levels
            transports: [vscodeTransport],
            logPrefix: ''
        });
    }

    /**
     * Private function to enable adding additional arguments to the log message.
     * Prepares the message for formatting with format.splat().
     *
     * @param level - log level
     * @param message - log message
     * @param args - additional arguments like objects, arrays, etc.
     */
    private logWithArgs(level: LogLevel, message: string, ...args: any): void {
        const winstonLevel = toWinstonLogLevel(level) ?? this._logger.level;
        if (args.length > 0) {
            message += ' %O'.repeat(args.length);
        }
        this._logger.log(winstonLevel, message, ...args);
    }

    /**
     * Log an error message.
     *
     * @param message - error message
     * @param args - additional arguments like objects, arrays, etc.
     */
    error(message: string, ...args: any): void {
        this.logWithArgs(LogLevel.Error, message, ...args);
    }

    /**
     * Log a warning message.
     *
     * @param message - warning message
     * @param args - additional arguments like objects, arrays, etc.
     */
    warn(message: string, ...args: any): void {
        this.logWithArgs(LogLevel.Warn, message, ...args);
    }

    /**
     * Log an info message.
     *
     * @param message - info message
     * @param args - additional arguments like objects, arrays, etc.
     */
    info(message: string, ...args: any): void {
        this.logWithArgs(LogLevel.Info, message, ...args);
    }

    /**
     * Log a debug message.
     *
     * @param message - debug message
     * @param args - additional arguments like objects, arrays, etc.
     */
    debug(message: string, ...args: any): void {
        this.logWithArgs(LogLevel.Debug, message, ...args);
    }

    /**
     * Log a trace message.
     *
     * @param message - log message
     * @param args - additional arguments like objects, arrays, etc.
     */
    trace(message: string, ...args: any): void {
        this.logWithArgs(LogLevel.Silly, message, ...args);
    }

    /**
     * Show the output channel in Visual Studio Code.
     */
    show(): void {
        const winstonVSCodeTransport = this._logger.transports.find((t) => t instanceof WinstonVSCodeTransport);
        if (winstonVSCodeTransport) {
            (winstonVSCodeTransport as WinstonVSCodeTransport).show();
        }
    }
}
