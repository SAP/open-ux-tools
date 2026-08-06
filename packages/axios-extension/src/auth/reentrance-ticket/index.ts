import type { Logger } from '@sap-ux/logger';
import type { AddressInfo } from 'node:net';
import axios from 'axios';
import { Agent } from 'node:https';
import open from 'open';
import { defaultTimeout } from '../connection.js';
import { ABAPVirtualHostProvider } from './abap-virtual-host-provider.js';
import { setupRedirectHandling } from './redirect.js';

/** Cloud reentrance endpoint (SAP BTP ABAP environment). */
const REENTRANCE_ENDPOINT = '/sap/bc/sec/reentrance';
/** ADT internal reentrance endpoint (used by older/internal systems that lack the cloud endpoint). */
const ADT_REENTRANCE_ENDPOINT = '/sap/bc/adt/core/http/reentranceticket';

/**
 * Determines which reentrance-ticket endpoint the backend exposes.
 *
 * Prefers the cloud endpoint (`/sap/bc/sec/reentrance`); if that responds with 404 the backend is
 * an older/internal system, so the ADT endpoint (`/sap/bc/adt/core/http/reentranceticket`) is used
 * instead. This is checked BEFORE opening the browser so the user is sent to a working URL.
 *
 * @param uiHostname resolved UI host origin
 * @param logger logger
 * @returns the reentrance endpoint path to use
 */
async function resolveReentranceEndpoint(uiHostname: string, logger: Logger): Promise<string> {
    const override = process.env.FIORI_TOOLS_REENTRANCE_ENDPOINT;
    if (override) {
        return override;
    }
    try {
        const response = await axios.get(`${uiHostname}${REENTRANCE_ENDPOINT}`, {
            // Do not follow redirects or throw on any status — we only care whether it is a 404.
            maxRedirects: 0,
            validateStatus: () => true,
            httpsAgent: new Agent({ rejectUnauthorized: false }),
            timeout: defaultTimeout
        });
        if (response.status === 404) {
            logger.debug(`${REENTRANCE_ENDPOINT} not found (404); falling back to ${ADT_REENTRANCE_ENDPOINT}`);
            return ADT_REENTRANCE_ENDPOINT;
        }
    } catch (error) {
        // Network/timeout errors are not a 404 signal; stick with the cloud endpoint.
        logger.debug(
            `Could not probe ${REENTRANCE_ENDPOINT}: ${error instanceof Error ? error.message : String(error)}`
        );
    }
    return REENTRANCE_ENDPOINT;
}

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
    const endpoint = await resolveReentranceEndpoint(uiHostname, logger);
    return new Promise((resolve, reject) => {
        // Start local server to listen to redirect call, with timeout
        const { server, redirectUrl } = setupRedirectHandling({ resolve, reject, timeout, backend, logger });
        server.listen();
        const redirectPort = (server.address() as AddressInfo).port;

        // Open browser to handle SAML flow and return the reentrance ticket
        const scenario = process.env.FIORI_TOOLS_SCENARIO ?? 'FTO1';
        // The cloud endpoint takes a `scenario` query param; the ADT endpoint does not use it.
        const scenarioParam = endpoint === REENTRANCE_ENDPOINT ? `scenario=${scenario}&` : '';
        const url = `${uiHostname}${endpoint}?${scenarioParam}redirect-url=${redirectUrl(redirectPort)}`;

        const result = open(url)?.catch((error) => logger.error(error));
        return result;
    });
}
