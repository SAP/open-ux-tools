/**
 * Log message collected during server startup.
 */
export interface LogMessage {
    message: string;
    timestamp: string;
    severity: 'warn' | 'error';
}

/**
 * Collects log messages during middleware initialization
 * so they can be served to the enhanced homepage UI.
 */
export class LogCollector {
    private logs: LogMessage[] = [];

    /**
     * Add a log message to the collection.
     *
     * @param severity - 'warn' or 'error'
     * @param message - the log text
     */
    addLog(severity: LogMessage['severity'], message: string): void {
        this.logs.push({
            message,
            timestamp: new Date().toISOString(),
            severity
        });
    }

    /**
     * Get all collected log messages.
     *
     * @returns a copy of the collected logs
     */
    getLogs(): LogMessage[] {
        return [...this.logs];
    }
}
