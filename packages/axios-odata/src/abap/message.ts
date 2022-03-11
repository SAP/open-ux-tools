import { Logger } from '@sap-ux/logger';
import { URL } from 'url';

/**
 * Message detail object
 */
export interface MessageDetail {
    code: string;
    message: string;
    severity: string;
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
 * Log a Gateway response.
 *
 * @param msg message returned from gateway
 * @param log logger to be used
 * @param host optional url that should logged as clickable url
 */
export function prettyPrintMessage({ msg, log, host }: { msg: SuccessMessage; log: Logger; host?: string }): void {
    log.info(msg.message);
    logFullURL({ host, path: msg['longtext_url'], log });
    if (msg.details) {
        msg.details.forEach((entry) => {
            log.info(entry.message);
        });
    }
}

/** Log if both host and path are provided */
function logFullURL({ host, path, log }: { host: string; path?: string; log: Logger }): void {
    if (host && path) {
        const base = new URL(host).origin; // We only care for the origin value
        log.info(new URL(path, base).href);
    }
}

/**
 * Log a Gateway error.
 *
 * @param error error message returned from gateway
 * @param log logger to be used
 */
export function prettyPrintError({ error, log, host }: { error: ErrorMessage; log: Logger; host?: string }): void {
    if (error) {
        log.error(error.message?.value || 'An unknown error occurred.');
        if (error.innererror) {
            (error.innererror.errordetails || []).forEach((entry) => {
                if (!entry.message.startsWith('<![CDATA')) {
                    log.error(entry.message);
                }
                logFullURL({ host, path: error['longtext_url'], log });
            });
            for (const key in error.innererror.Error_Resolution || {}) {
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
