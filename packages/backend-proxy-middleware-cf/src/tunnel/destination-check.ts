import fs from 'node:fs';
import path from 'node:path';

import type { ToolsLogger } from '@sap-ux/logger';
import { DestinationProxyType } from '@sap-ux/btp-utils';
import type { ServiceKeyCredentialsWithTags, Uaa } from '@sap-ux/adp-tooling';
import { getToken, getBtpDestinationConfig } from '@sap-ux/adp-tooling';

import type { XsappConfig } from '../types';

/**
 * Auth info needed to call the BTP Destination Configuration API.
 */
interface BtpDestinationServiceAuth {
    /** UAA credentials for obtaining an OAuth token. */
    uaa: Uaa;
    /** Destination Configuration API base URI. */
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
 * Extract BTP destination service auth from process.env.VCAP_SERVICES.
 *
 * @returns Auth info or undefined if no destination service is bound.
 */
function getBtpDestinationServiceAuth(): BtpDestinationServiceAuth | undefined {
    const raw = process.env.VCAP_SERVICES;
    if (!raw) {
        return undefined;
    }

    let vcapServices: Record<string, ServiceKeyCredentialsWithTags[]>;
    try {
        vcapServices = JSON.parse(raw);
    } catch {
        return undefined;
    }

    const entries = vcapServices['destination'];
    if (!Array.isArray(entries) || entries.length === 0) {
        return undefined;
    }

    const credentials = entries[0].credentials;
    if (!credentials?.clientid || !credentials?.clientsecret || !credentials?.url || !credentials?.uri) {
        return undefined;
    }

    return {
        uaa: { clientid: credentials.clientid, clientsecret: credentials.clientsecret, url: credentials.url },
        uri: String(credentials.uri)
    };
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

    const auth = getBtpDestinationServiceAuth();
    if (!auth) {
        logger.debug('No destination service credentials in VCAP_SERVICES, cannot check destination types.');
        return false;
    }

    let token: string;
    try {
        token = await getToken(auth.uaa, logger);
    } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        logger.warn(`Failed to obtain OAuth token for destination service: ${message}`);
        return false;
    }

    for (const name of destinationNames) {
        try {
            const config = await getBtpDestinationConfig(auth.uri, token, name, logger);
            if (config?.ProxyType === DestinationProxyType.ON_PREMISE) {
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
