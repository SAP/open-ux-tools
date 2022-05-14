import type { Logger } from '@sap-ux/logger';
import express from 'express';
import http from 'http';
import { TimeoutError } from '../error';
import { prettyPrintTimeInMs } from '../../abap/message';
import { redirectSuccessHtml } from '../static';
import type { ABAPSystem } from '../abap-system';

interface Redirect {
    server: http.Server;
    redirectUrl(port: number): string;
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
export function setupRedirectHandling({
    resolve,
    reject,
    timeout,
    backend,
    logger
}: {
    resolve;
    reject;
    timeout: number;
    backend: ABAPSystem;
    logger: Logger;
}): Redirect {
    const app = express();
    const server = http.createServer(app);
    const REDIRECT_PATH = '/redirect';

    const handleTimeout = (): void => {
        server.close();
        reject(new TimeoutError(`Timeout. Did not get a response within ${prettyPrintTimeInMs(timeout)}`));
    };

    const timer = setTimeout(handleTimeout, timeout);
    app.get(REDIRECT_PATH, (req, res) => {
        const reentranceTicket = req.query['reentrance-ticket']?.toString();
        logger.debug('Got reentrance ticket: ' + reentranceTicket);
        res.set('Content-Type', 'text/html');
        res.send(Buffer.from(redirectSuccessHtml(backend.logoffUrl())));
        if (timer) {
            clearTimeout(timer);
        }
        server.close();
        resolve({ reentranceTicket, apiUrl: backend.apiHostname() });
    });

    return {
        server,
        redirectUrl: (port: number) => `http://localhost:${port}${REDIRECT_PATH}`
    };
}
