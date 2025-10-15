import type { Logger } from '@sap-ux/logger';
import type { AddressInfo } from 'node:net';
import open = require('open');
import { defaultTimeout } from '../connection';
import { ABAPVirtualHostProvider } from './abap-virtual-host-provider';
import { setupRedirectHandling } from './redirect';

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
}): Promise<{ reentranceTicket: string; backend?: ABAPVirtualHostProvider }> {
    const backend = new ABAPVirtualHostProvider(backendUrl, logger);
    const uiHostname = await backend.uiHostname();
    return new Promise((resolve, reject) => {
        // Start local server to listen to redirect call, with timeout
        const { server, redirectUrl } = setupRedirectHandling({ resolve, reject, timeout, backend, logger });
        server.listen();
        const redirectPort = (server.address() as AddressInfo).port;

        // Open browser to handle SAML flow and return the reentrance ticket
        const scenario = process.env.FIORI_TOOLS_SCENARIO ?? 'FTO1';
        const endpoint = process.env.FIORI_TOOLS_REENTRANCE_ENDPOINT ?? ADT_REENTRANCE_ENDPOINT;
        const url = `${uiHostname}${endpoint}?scenario=${scenario}&redirect-url=${redirectUrl(redirectPort)}`;

        const result = open(url)?.catch((error) => logger.error(error));
        return result;
    });
}
