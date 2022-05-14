import type { Logger } from '@sap-ux/logger';
import type { AddressInfo } from 'net';
import open = require('open');
import { defaultTimeout } from '../connection';
import { ABAPSystem } from '../abap-system';
import { setupRedirectHandling } from './redirect';

const ADT_REENTRANCE_ENDPOINT = '/sap/bc/adt/core/http/reentranceticket';

/**
 * Get the reentrance ticket from the backend.
 *
 * @param options
 * @param options.backendUrl
 * @param options.logger
 * @param options.timeout
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
        const backend = new ABAPSystem(backendUrl);
        // Start local server to listen to redirect call, with timeout
        const { server, redirectUrl } = setupRedirectHandling({ resolve, reject, timeout, backend, logger });
        server.listen();

        const redirectPort = (server.address() as AddressInfo).port;

        // Open browser to handle SAML flow and return the reentrance ticket
        const url = `${backend.uiHostname()}${ADT_REENTRANCE_ENDPOINT}?redirect-url=${redirectUrl(redirectPort)}`;
        open(url);
    });
}
