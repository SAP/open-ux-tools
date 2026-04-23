import axios from 'axios';

import type { ToolsLogger } from '@sap-ux/logger';
import type { Destinations } from '@sap-ux/btp-utils';

import { t } from '../i18n';
import type { Uaa, BtpDestinationConfig, CfDestinationServiceCredentials } from '../types';

/**
 * Obtain an OAuth2 access token using the client credentials grant.
 *
 * @param uaa - UAA service credentials (clientid, clientsecret, url).
 * @param logger - Optional logger.
 * @returns OAuth2 access token.
 */
export async function getToken(uaa: Uaa, logger?: ToolsLogger): Promise<string> {
    const auth = Buffer.from(`${uaa.clientid}:${uaa.clientsecret}`);
    const options = {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + auth.toString('base64')
        }
    };
    const uri = `${uaa.url}/oauth/token`;
    logger?.debug(`Requesting OAuth token from ${uri}`);
    try {
        const response = await axios.post(uri, 'grant_type=client_credentials', options);
        logger?.debug('OAuth token obtained successfully');
        return response.data['access_token'];
    } catch (e) {
        logger?.error(`Failed to obtain OAuth token from ${uri}: ${e instanceof Error ? e.message : String(e)}`);
        throw new Error(t('error.failedToGetAuthKey', { error: e instanceof Error ? e.message : String(e) }));
    }
}

/**
 * Get a single destination's configuration from the BTP Destination Configuration API.
 * Note: This calls the BTP Destination Configuration API, not the BAS listDestinations API.
 *
 * @param uri - Destination Configuration API base URI (e.g. https://destination-configuration.cfapps.us20.hana.ondemand.com).
 * @param token - OAuth2 bearer token obtained via {@link getToken}.
 * @param destinationName - Name of the destination to look up.
 * @param logger - Optional logger.
 * @returns The destinationConfiguration object (e.g. Name, ProxyType, URL, Authentication) or undefined on failure.
 */
export async function getBtpDestinationConfig(
    uri: string,
    token: string,
    destinationName: string,
    logger?: ToolsLogger
): Promise<BtpDestinationConfig | undefined> {
    const url = `${uri}/destination-configuration/v1/destinations/${encodeURIComponent(destinationName)}`;
    logger?.debug(`Fetching BTP destination config for "${destinationName}" from ${url}`);

    try {
        const response = await axios.get<{ destinationConfiguration?: BtpDestinationConfig }>(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const config = response.data?.destinationConfiguration;
        logger?.debug(`Destination "${destinationName}" config: ProxyType=${config?.ProxyType}`);
        return config;
    } catch (e) {
        logger?.error(
            `Failed to fetch destination config for "${destinationName}": ${e instanceof Error ? e.message : String(e)}`
        );
        return undefined;
    }
}

/**
 * Lists all subaccount destinations from the BTP Destination Configuration API.
 *
 * @param {CfDestinationServiceCredentials} credentials - Destination service credentials.
 * @returns {Promise<Destinations>} Map of destination name to Destination object.
 */
export async function listBtpDestinations(credentials: CfDestinationServiceCredentials): Promise<Destinations> {
    const uaa =
        'uaa' in credentials
            ? credentials.uaa
            : { clientid: credentials.clientid, clientsecret: credentials.clientsecret, url: credentials.url };
    const token = await getToken(uaa);
    const url = `${credentials.uri}/destination-configuration/v1/subaccountDestinations`;
    try {
        const response = await axios.get<BtpDestinationConfig[]>(url, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const configs = Array.isArray(response.data) ? response.data : [];
        return configs.reduce<Destinations>((acc, config) => {
            acc[config.Name] = {
                Name: config.Name,
                Host: config.URL,
                Type: config.Type,
                Authentication: config.Authentication,
                ProxyType: config.ProxyType,
                Description: config.Description ?? ''
            };
            return acc;
        }, {});
    } catch (e) {
        throw new Error(t('error.failedToListBtpDestinations', { error: e instanceof Error ? e.message : String(e) }));
    }
}
