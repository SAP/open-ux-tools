import fs from 'node:fs';
import path from 'node:path';

import { DestinationProxyType } from '@sap-ux/btp-utils';
import type { ToolsLogger } from '@sap-ux/logger';

import type { XsappConfig } from '../types';

/**
 * Credentials extracted from VCAP_SERVICES for the BTP destination service instance.
 */
interface DestinationServiceCredentials {
    clientid: string;
    clientsecret: string;
    /** OAuth token URL (e.g. https://mysubaccount.authentication.us20.hana.ondemand.com) */
    url: string;
    /** Destination Configuration API base URI (e.g. https://destination-configuration.cfapps.us20.hana.ondemand.com) */
    uri: string;
}

/**
 * Extract unique destination names from the routes in webapp/xs-app.json.
 *
 * @param rootPath - Project root path.
 * @returns Array of unique destination names, or empty array if no webapp/xs-app.json or no destinations.
 */
function getWebappXsappDestinationNames(rootPath: string): string[] {
    const xsappPath = path.join(rootPath, 'webapp', 'xs-app.json');
    if (!fs.existsSync(xsappPath)) {
        return [];
    }

    try {
        const xsappConfig = JSON.parse(fs.readFileSync(xsappPath, 'utf8')) as XsappConfig;
        const names = new Set<string>();
        for (const route of xsappConfig.routes ?? []) {
            if (route.destination) {
                names.add(route.destination);
            }
        }
        return [...names];
    } catch {
        return [];
    }
}

/**
 * Extract destination service credentials from process.env.VCAP_SERVICES.
 *
 * @returns Credentials or undefined if no destination service is bound.
 */
function getDestinationServiceCredentials(): DestinationServiceCredentials | undefined {
    const raw = process.env.VCAP_SERVICES;
    if (!raw) {
        return undefined;
    }

    let vcap: Record<string, unknown>;
    try {
        vcap = JSON.parse(raw);
    } catch {
        return undefined;
    }

    const entries = vcap['destination'];
    if (!Array.isArray(entries)) {
        return undefined;
    }

    for (const entry of entries) {
        const creds = entry?.credentials;
        if (creds?.clientid && creds?.clientsecret && creds?.uri && creds?.url) {
            return {
                clientid: String(creds.clientid),
                clientsecret: String(creds.clientsecret),
                uri: String(creds.uri),
                url: String(creds.url)
            };
        }
    }
    return undefined;
}

/**
 * Obtain an OAuth2 client-credentials token from the UAA bound to the destination service.
 *
 * @param credentials - Destination service credentials.
 * @returns Access token string.
 */
async function fetchOAuthToken(credentials: DestinationServiceCredentials): Promise<string> {
    const tokenUrl = `${credentials.url}/oauth/token`;
    const basicAuth = Buffer.from(`${credentials.clientid}:${credentials.clientsecret}`).toString('base64');

    const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${basicAuth}`
        },
        body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
        throw new Error(`Token request failed with status ${response.status}`);
    }

    const data = (await response.json()) as { access_token: string };
    return data.access_token;
}

/**
 * Fetch a single destination's ProxyType from the BTP Destination Configuration API.
 *
 * @param credentials - Destination service credentials (provides the API base URI).
 * @param token - OAuth2 bearer token.
 * @param destinationName - Name of the destination to look up.
 * @returns The ProxyType string (e.g. "OnPremise", "Internet") or undefined on failure.
 */
async function fetchDestinationProxyType(
    credentials: DestinationServiceCredentials,
    token: string,
    destinationName: string
): Promise<string | undefined> {
    const url = `${credentials.uri}/destination-configuration/v1/destinations/${encodeURIComponent(destinationName)}`;

    const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
        return undefined;
    }

    const data = (await response.json()) as { destinationConfiguration?: { ProxyType?: string } };
    return data.destinationConfiguration?.ProxyType;
}

/**
 * Check whether the adaptation project's webapp/xs-app.json exists and contains at least
 * one route whose destination is configured as OnPremise in the BTP Destination Service.
 *
 * @param rootPath - Project root path.
 * @param logger - Logger instance.
 * @returns True if an OnPremise destination is found; false otherwise.
 */
export async function hasOnPremiseDestination(rootPath: string, logger: ToolsLogger): Promise<boolean> {
    const destinationNames = getWebappXsappDestinationNames(rootPath);
    if (destinationNames.length === 0) {
        logger.debug('No webapp/xs-app.json or no destinations in routes, skipping OnPremise check.');
        return false;
    }

    const credentials = getDestinationServiceCredentials();
    if (!credentials) {
        logger.debug('No destination service credentials in VCAP_SERVICES, cannot check destination types.');
        return false;
    }

    let token: string;
    try {
        token = await fetchOAuthToken(credentials);
    } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        logger.warn(`Failed to obtain OAuth token for destination service: ${message}`);
        return false;
    }

    for (const name of destinationNames) {
        try {
            const proxyType = await fetchDestinationProxyType(credentials, token, name);
            if (proxyType === DestinationProxyType.ON_PREMISE) {
                logger.info(`Destination "${name}" is OnPremise, SSH tunnel is needed.`);
                return true;
            }
        } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            logger.debug(`Could not check destination "${name}": ${message}`);
        }
    }

    logger.debug('No OnPremise destinations found in webapp/xs-app.json routes.');
    return false;
}
