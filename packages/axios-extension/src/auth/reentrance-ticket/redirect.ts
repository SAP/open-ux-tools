import type { Logger } from '@sap-ux/logger';
import http from 'http';
import { ConnectionError, TimeoutError } from '../error';
import { prettyPrintTimeInMs } from '../../abap/message';
import { redirectErrorHtml, redirectSuccessHtml } from '../static';
import type { ABAPVirtualHostProvider } from './abap-virtual-host-provider';

interface Redirect {
    server: http.Server;
    /**
     * Redirect URL.
     *
     * @param port Port number.
     * @returns Redirect URL.
     */
    redirectUrl(port: number): string;
}

export interface SetupRedirectOptions {
    resolve;
    reject;
    timeout: number;
    backend: ABAPVirtualHostProvider;
    logger: Logger;
}

/**
 *
 * @param options options object
 * @param options.resolve Callback for when redirect is successful
 * @param options.reject Callback for when redirect fails
 * @param options.timeout timeout in milliseconds
 * @param options.backend backend ABAP System
 * @param options.logger logger
 * @returns a `Redirect` object
 */
export function setupRedirectHandling({ resolve, reject, timeout, backend, logger }: SetupRedirectOptions): Redirect {
    const REDIRECT_PATH = '/redirect';

    // eslint-disable-next-line prefer-const
    let server: http.Server;

    const handleTimeout = (): void => {
        server?.close();
        reject(new TimeoutError(`Timeout. Did not get a response within ${prettyPrintTimeInMs(timeout)}`));
    };

    const timer = setTimeout(handleTimeout, timeout);
    server = http.createServer((req, res): void => {
        const reqUrl = new URL(req.url, `http://${req.headers.host}`);
        if (reqUrl.pathname === REDIRECT_PATH) {
            if (timer) {
                clearTimeout(timer);
            }
            const reentranceTicket = reqUrl.searchParams.get('reentrance-ticket')?.toString();
            if (reentranceTicket) {
                logger.debug('Got reentrance ticket: ' + reentranceTicket);
                backend
                    .logoffUrl()
                    .then((url) => {
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(Buffer.from(redirectSuccessHtml(url)));
                    })
                    .catch(() => {});
                server.close();
                // return the backend for convienience
                resolve({ reentranceTicket, backend });
            } else {
                logger.error('Error getting reentrance ticket');
                logger.debug(req);
                res.writeHead(500, { 'Content-Type': 'text/html' });
                res.end(Buffer.from(redirectErrorHtml()));
                server.close();
                reject(new ConnectionError('Error getting reentrance ticket'));
            }
        }
    });

    return {
        server,
        redirectUrl: (port: number) => `http://localhost:${port}${REDIRECT_PATH}`
    };
}
