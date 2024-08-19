import type { Logger } from '@sap-ux/logger';
import { URL } from 'url';
import { isAxiosError } from 'axios';

/**
 * Message detail object
 */
export interface MessageDetail {
    code: string;
    message: string;
    severity: string;
    longtext_url?: string;
}

/**
 * Structure of a Gateway response message
 */
export interface SuccessMessage {
    code: string;
    message: string;
    longtext_url?: string;
    details: MessageDetail[];
}

/**
 * Structure of a Gateway error
 */
export interface ErrorMessage {
    code: string;
    message: {
        lang?: string;
        value: string;
    };
    longtext_url?: string;
    innererror: {
        transactionid: string;
        timestamp: string;
        Error_Resolution: object;
        errordetails: MessageDetail[];
    };
}

/**
 *
 * @param severity
 * @param msg
 * @param log
 * @param error
 */
function logLevel(severity: string, msg: string, log: Logger, error = false): void {
    if (severity) {
        severity = severity.toLowerCase();
        if (severity === 'success') {
            log.info(msg);
        } else {
            if (severity === 'warning') {
                severity = 'warn';
            }
            log[severity](msg);
        }
    } else {
        error ? log.error(msg) : log.info(msg);
    }
}

/**
 * Log a Gateway response.
 *
 * @param options  options
 * @param options.msg message string returned from gateway
 * @param options.log logger to be used
 * @param options.host optional url that should logged as clickable url
 * @param options.isDest optional destination flag
 */
export function prettyPrintMessage({
    msg,
    log,
    host,
    isDest = false
}: {
    msg: string;
    log: Logger;
    host?: string;
    isDest?: boolean;
}): void {
    try {
        const jsonMsg = JSON.parse(msg) as SuccessMessage;
        log.info(jsonMsg.message);
        logFullURL({ host, path: jsonMsg['longtext_url'], log, isDest });
        if (jsonMsg.details) {
            jsonMsg.details.forEach((entry) => {
                logLevel(entry.severity, entry.message, log);
            });
        }
    } catch (error) {
        // if for some reason the backend doesn't return proper JSON, just print it plain text.
        log.debug(msg);
    }
}

/**
 * @param root0 root0
 * @param root0.host hostname
 * @param root0.path path
 * @param root0.log log
 * @param root0.isDest destination
 */
function logFullURL({
    host,
    path,
    log,
    isDest = false
}: {
    host: string;
    path?: string;
    log: Logger;
    isDest?: boolean;
}): void {
    if (host && path) {
        const base = new URL(host).origin; // We only care for the origin value
        // Add this instruction to the user because of this bug in VS Code: https://github.com/microsoft/vscode/issues/144898
        // It undoes the encoding of special characters in the URL sent to the browser
        log.info('Please copy/paste this URL in a browser for more details:');
        if (isDest) {
            log.info(
                '(Note: You will need to replace the host in the URL with the internal host, if your destination is configured using an On-Premise SAP Cloud Connector)'
            );
        }
        log.info(new URL(path, base).href);
    }
}

/**
 * Log Gateway errors returned from the S_MGW_ODATA_INNER_ERROR table which is a store of OData Inner Error data. In certain flows,
 * for example, when test mode is enabled, not all error details should be displayed to the user and need to be restricted.
 *
 * @param  options options
 * @param options.error error message returned from gateway
 * @param options.log logger to be used
 * @param options.host optional host name to pretty print links
 * @param options.isDest optional value if additional info should be printed
 * @param showAllMessages optional, show all errors but restrict for certain flows i.e. test mode
 */
export function prettyPrintError(
    { error, log, host, isDest }: { error: ErrorMessage; log: Logger; host?: string; isDest?: boolean },
    showAllMessages = true
): void {
    if (error) {
        if (showAllMessages) {
            log.error(error.message?.value || 'An unknown error occurred.');
        }
        (error.innererror?.errordetails || []).forEach((entry) => {
            if (!entry.message.startsWith('<![CDATA')) {
                logLevel(entry.severity, entry.message, log, true);
            }
            logFullURL({ host, path: entry['longtext_url'], log, isDest });
        });
        if (showAllMessages && error.innererror?.Error_Resolution) {
            for (const key in error.innererror.Error_Resolution) {
                log.error(`${key}: ${error.innererror.Error_Resolution[key]}`);
            }
        }
    }
}

/**
 * Print a user friendly time string.
 *
 * @param ms time in ms
 * @returns user friendly string
 */
export const prettyPrintTimeInMs = (ms: number): string => {
    const min = (ms / 60 / 1000) | 0;
    if (min > 1) {
        return `${min} minutes`;
    } else if (min === 1) {
        return '1 minute';
    } else {
        return `${ms / 1000} seconds`;
    }
};

/**
 * Log errors more user friendly if it is a standard Gateway error.
 *
 * @param e error thrown by Axios after sending a request
 * @param e.error error from Axios
 * @param e.log logger to be used
 * @param e.host optional hostname
 * @param e.isDest optional destination flag
 */
export function logError({
    error,
    host,
    log,
    isDest
}: {
    error: Error;
    host?: string;
    log: Logger;
    isDest?: boolean;
}): void {
    log.error(error.message);
    if (isAxiosError(error) && error.response?.data) {
        const errorMessage = getErrorMessageFromString(error.response?.data);
        if (errorMessage) {
            prettyPrintError({ error: errorMessage, log: log, host: host, isDest: isDest });
        } else {
            log.error(error.response.data.toString());
        }
    }
}

/**
 * Get ErrorMessage object from response contain an error as a string.
 *
 * @param data string value
 * @returns undefined if an error object is not found or populated ErrorMessage object
 */
export function getErrorMessageFromString(data: unknown): ErrorMessage | undefined {
    let error;
    if (typeof data === 'string') {
        try {
            const errorMsg = JSON.parse(data);
            if (errorMsg.error) {
                error = errorMsg.error as ErrorMessage;
            }
        } catch {
            // Not much we can do!
        }
    }
    return error;
}
