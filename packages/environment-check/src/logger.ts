import { ArrayTransport, ToolsLogger } from '@sap-ux/logger';
import type { ArrayTransportLogEntry } from '@sap-ux/logger';
import type { ILogger, ResultMessage, Severity } from './types';

/**
 * Logger to collect messages while performing checks
 */
class Logger extends ToolsLogger implements ILogger {
    constructor() {
        super({ transports: [new ArrayTransport()] });
    }

    /**
     * Log multiple messages at once.
     *
     * @param newMessages - messages to be logged
     */
    push(...newMessages: ResultMessage[]): void {
        for (const message of newMessages) {
            this[message.severity](message.text);
        }
    }

    /**
     * Return all logged messages.
     *
     * @returns - messages with severity
     */
    getMessages(): ResultMessage[] {
        let messages: ResultMessage[] = [];
        const transport = this.transports().find((t) => t instanceof ArrayTransport);
        if (transport instanceof ArrayTransport) {
            messages = transport.logs.map((message: ArrayTransportLogEntry) => ({
                severity: message.level as Severity,
                text: message.message
            }));
        }
        return messages;
    }
}

/**
 * Return a logger to log messages. Once done adding messages, call getMessages()
 * to retrive an array of logged messages.
 *
 * @returns logger to log messages
 */
export function getLogger(): Logger {
    return new Logger();
}
