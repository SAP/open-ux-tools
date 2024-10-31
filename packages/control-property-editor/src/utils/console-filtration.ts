export type LogType = 'log' | 'warn' | 'error';

/**
 * A list of blacklisted words or phrases that, if present in the log message,
 * will prevent the message from being processed.
 */
const blacklistedWords = [
    'file not found',
    'connector',
    'logo',
    'cache key',
    'failed to load',
    'unknown message received',
    'DesignTime'
];
/**
 * A list of whitelisted words or phrases that, if present in the log message,
 * will ensure the message is processed, overriding any blacklisting.
 */
const whitelistedWords = ['important', 'critical', 'alert'];

/**
 * Removes the date and time from the beginning of a log message.
 *
 * @param {string} message - The log message to process.
 * @returns {string} The message with the date and time removed.
 *
 * @example
 * const cleanMessage = removeDateFromMessage('2024-10-31 11:56:44.825100 Example log message');
 * // Result: 'Example log message'
 */
export const removeDateFromMessage = (message: string): string => {
    return message.replace(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{6} /, '');
};

/**
 * Filters log messages based on predefined blacklisted and whitelisted words.
 *
 * @param {LogType} type - The type of log message ('log', 'warn', or 'error').
 * @param {any[]} args - The arguments of the log message.
 * @returns {boolean} `true` if the message should be processed; `false` otherwise.
 *
 * @example
 * const shouldLog = filterLogs('log', ['2024-10-31 11:56:44.825100 Example message']);
 * // Result: depends on the content of the message and the blacklisted/whitelisted words
 */
export const filterLogs = (type: LogType, args: any[]): boolean => {
    const message = args.join(' ').toLowerCase();

    if (blacklistedWords.some((word) => message.includes(word.toLowerCase()))) {
        return false;
    }

    if (whitelistedWords.some((word) => message.includes(word.toLowerCase()))) {
        return true;
    }

    if (type === 'error' && message.includes('specific-error-keyword')) {
        return false;
    }

    return true;
};
