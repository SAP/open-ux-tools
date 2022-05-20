import type { Logger } from '@sap-ux/logger';
import express from 'express';
import http from 'http';
import { ConnectionError, TimeoutError } from '../error';
import { prettyPrintTimeInMs } from '../../abap/message';
import { redirectErrorHtml, redirectSuccessHtml } from '../static';
import type { ABAPSystem } from './abap-system';

interface Redirect {
    server: http.Server;
    redirectUrl(port: number): string;
}

export interface SetupRedirectOptions {
    resolve;
    reject;
    timeout: number;
    backend: ABAPSystem;
    logger: Logger;
}

/**
 *
 * @param root0
 * @param root0.resolve
 * @param root0.reject
 * @param root0.timeout
 * @param root0.backend
 * @param root0.logger
 * @returns a `Redirect` object
 */
export function setupRedirectHandling({ resolve, reject, timeout, backend, logger }: SetupRedirectOptions): Redirect {
    const app = express();
    const server = http.createServer(app);
    const REDIRECT_PATH = '/redirect';

    const handleTimeout = (): void => {
        server.close();
        reject(new TimeoutError(`Timeout. Did not get a response within ${prettyPrintTimeInMs(timeout)}`));
    };

    const timer = setTimeout(handleTimeout, timeout);
    app.get(REDIRECT_PATH, (req, res) => {
        if (timer) {
            clearTimeout(timer);
        }
        const reentranceTicket = req.query['reentrance-ticket']?.toString();
        if (reentranceTicket) {
            logger.debug('Got reentrance ticket: ' + reentranceTicket);
            res.set('Content-Type', 'text/html');
            res.send(Buffer.from(redirectSuccessHtml(backend.logoffUrl())));
            server.close();
            resolve({ reentranceTicket, apiUrl: backend.apiHostname() });
        } else {
            logger.error('Error getting reentrance ticket');
            logger.debug(req);
            res.set('Content-Type', 'text/html');
            res.status(500);
            res.send(Buffer.from(redirectErrorHtml()));
            server.close();
            reject(new ConnectionError('Error getting reentrance ticket'));
        }
    });

    return {
        server,
        redirectUrl: (port: number) => `http://localhost:${port}${REDIRECT_PATH}`
    };
}
