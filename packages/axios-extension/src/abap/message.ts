import { Logger } from '@sap-ux/logger';

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
    innererror: {
        transactionid: string;
        timestamp: string;
        Error_Resolution: object;
        errordetails: MessageDetail[];
    };
}

/**
 * Log a Gateway response
 * @param msg message returned from gateway
 * @param log logger to be used
 */
export function prettyPrintMessage(msg: SuccessMessage, log: Logger): void {
    log.info(msg.message);
    if (msg.details) {
        msg.details.forEach((entry) => {
            log.info(entry.message);
        });
    }
}

/**
 * Log a Gateway error
 * @param msg error message returned from gateway
 * @param log logger to be used
 */
export function prettyPrintError(error: ErrorMessage, log: Logger): void {
    if (error) {
        log.error(error.message?.value);
        if (error.innererror) {
            if (error.innererror.errordetails) {
                error.innererror.errordetails.forEach((entry) => {
                    if (!entry.message.startsWith('<![CDATA')) log.error(entry.message);
                });
            }
            if (error.innererror.Error_Resolution) {
                for (const key in error.innererror.Error_Resolution) {
                    log.error(`${key}: ${error.innererror.Error_Resolution[key]}`);
                }
            }
        }
    }
}

/**
 * Print a user friendly time string/
 * @param ms time in ms
 * @returns user friendly string
 */
export const prettyPrintTimeInMs = (ms: number): string => {
    const min = ms / 60 / 1000;
    if (min > 1) {
        return `${min} minutes`;
    } else if (min === 1) {
        return '1 minute';
    } else {
        return `${ms / 1000} seconds`;
    }
};
