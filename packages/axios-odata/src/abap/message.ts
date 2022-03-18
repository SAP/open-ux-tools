import type { Logger } from '@sap-ux/logger';
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
 * @param options
 * @param options.msg message returned from gateway
 * @param options.log logger to be used
 * @param options.host optional url that should logged as clickable url
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

/**
 * @param root0
 * @param root0.host
 * @param root0.path
 * @param root0.log
 */
function logFullURL({ host, path, log }: { host: string; path?: string; log: Logger }): void {
    if (host && path) {
        const base = new URL(host).origin; // We only care for the origin value
        // Add this instruction to the user because of this bug in VS Code: https://github.com/microsoft/vscode/issues/144898
        // It undoes the encoding of special characters in the URL sent to the browser
        // @todo: use i18n texts
        log.info('Please copy/paste this URL in a browser for more details:');
        log.info(new URL(path, base).href);
    }
}

/**
 * Log a Gateway error.
 *
 * @param  options
 * @param options.error error message returned from gateway
 * @param options.log logger to be used
 * @param options.host optional host name to pretty print links
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
