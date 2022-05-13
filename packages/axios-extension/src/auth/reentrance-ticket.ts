import type { Logger } from '@sap-ux/logger';
import express from 'express';
import http from 'http';
import { TimeoutError } from './error';
import { prettyPrintTimeInMs } from '../abap/message';
import { redirectSuccessHtml } from './static';
import type { AddressInfo } from 'net';
import open = require('open');
import { defaultTimeout } from './connection';

class ABAPSystem {
    /***
     * Removes any `-api` suffix in the first label of the hostname
     */
    static uiHostname(hostname: string): string {
        const [first, ...rest] = hostname.split('.');
        return [first.replace('-api', ''), ...rest].join('.');
    }
    /**
     *
     * Adds a `-api` suffix to the first label of the hostname
     */
    static apiHostname(hostname: string): string {
        const [first, ...rest] = hostname.split('.');
        return !first.match(/.*-api$/) ? [first + '-api', ...rest].join('.') : hostname;
    }

    // @todo: make sure this works
    static logoffUrl(hostname: string): string {
        return this.uiHostname(hostname) + '/sap/public/bc/icf/logoff';
    }
}
const ADT_REENTRANCE_ENDPOINT = '/sap/bc/adt/core/http/reentranceticket';

/**
 *
 * Open a browser pointing to the ADT endpoint and pass in a redirection URL.
 * Start a local server at the redirection URL.
 * Browser takes care of the SAML authentication and returns a 'reentrance ticket'.
 *
 */
export async function getReentranceTicket({
    backendUrl,
    logger,
    timeout = defaultTimeout
}: {
    backendUrl: string;
    logger: Logger;
    timeout?: number;
}): Promise<{ reentranceTicket: string; apiUrl?: string }> {
    return new Promise((resolve, reject) => {
        // Start local server to listen to redirect call, with timeout
        const app = express();
        const server = http.createServer(app);

        const handleTimeout = (): void => {
            server.close();
            reject(new TimeoutError(`Timeout. Did not get a response within ${prettyPrintTimeInMs(timeout)}`));
        };

        class Redirect {
            public static readonly path = '/redirect';

            public static url(port: number): string {
                return 'http://localhost:' + port + Redirect.path;
            }
        }

        const timer = setTimeout(handleTimeout, timeout);
        app.get(Redirect.path, (req, res) => {
            const reentranceTicket = req.query['reentrance-ticket']?.toString();
            logger.info('Got reentrance ticket: ' + reentranceTicket);
            res.set('Content-Type', 'text/html');
            res.send(Buffer.from(redirectSuccessHtml(ABAPSystem.logoffUrl(backendUrl))));
            if (timer) {
                clearTimeout(timer);
            }
            server.close();
            resolve({ reentranceTicket, apiUrl: ABAPSystem.apiHostname(backendUrl) });
        });

        server.listen();
        const redirectPort = (server.address() as AddressInfo).port;

        // Open browser to handle SAML flow
        const url = `${ABAPSystem.uiHostname(backendUrl)}${ADT_REENTRANCE_ENDPOINT}?redirect-url=${Redirect.url(
            redirectPort
        )}`;
        open(url);
    });
}
