import type { Logger } from '@sap-ux/logger';
import type { AddressInfo } from 'net';
import open = require('open');
import { defaultTimeout } from '../connection';
import { ABAPSystem } from './abap-system';
import { setupRedirectHandling } from './redirect';

/**
 * DO NOT USE THIS SERVICE ENDPOINT DIRECTLY.
 * It might be removed in the future without notice.
 */
const ADT_REENTRANCE_ENDPOINT = '/sap/bc/sec/reentrance';

/**
 * Get the reentrance ticket from the backend.
 *
 * @param options options
 * @param options.backendUrl backend Url
 * @param options.logger  logger
 * @param options.timeout timeout in milliseconds
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
        const scenario = process.env.FIORI_TOOLS_SCENARIO ?? 'FTO1';
        const url = `${backend.uiHostname()}${ADT_REENTRANCE_ENDPOINT}?scenario=${scenario}&redirect-url=${redirectUrl(
            redirectPort
        )}`;
        open(url)?.catch((error) => logger.error(error));
    });
}
