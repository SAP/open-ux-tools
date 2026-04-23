import * as path from 'node:path';

import type { Destinations } from '@sap-ux/btp-utils';

import { getOrCreateServiceInstanceKeys } from './api';
import { listBtpDestinations } from '../../btp/api';
import { getYamlContent } from '../project/yaml-loader';
import { t } from '../../i18n';
import type { CfDestinationServiceCredentials, MtaYaml } from '../../types';

/**
 * Finds the name of the destination service instance declared in the MTA project's mta.yaml.
 *
 * @param {string} projectPath - The root path of the app project.
 * @returns {string} The CF service instance name.
 * @throws {Error} When the destination service instance is not found or mta.yaml cannot be read.
 */
function getDestinationServiceName(projectPath: string): string {
    try {
        const yamlContent = getYamlContent<MtaYaml>(path.join(path.dirname(projectPath), 'mta.yaml'));
        const name = yamlContent?.resources?.find((r) => r.parameters?.service === 'destination')?.name;
        if (!name) {
            throw new Error(t('error.destinationServiceNotFoundInMtaYaml'));
        }
        return name;
    } catch (e) {
        throw e instanceof Error ? e : new Error(t('error.destinationServiceNotFoundInMtaYaml'));
    }
}

/**
 * Returns the list of available BTP destinations from the logged-in CF subaccount.
 * Reads the destination service credentials from the CF project's service keys
 * and calls the BTP Destination Configuration API directly.
 *
 * @param {string} projectPath - The root path of the CF app project.
 * @returns {Promise<Destinations>} Map of destination name to Destination object.
 */
export async function getBtpDestinations(projectPath: string): Promise<Destinations> {
    const destinationServiceName = getDestinationServiceName(projectPath);

    const serviceInfo = await getOrCreateServiceInstanceKeys({ names: [destinationServiceName] });
    if (!serviceInfo?.serviceKeys?.length) {
        throw new Error(t('error.noServiceKeysFoundForDestination', { serviceInstanceName: destinationServiceName }));
    }

    const credentials = serviceInfo.serviceKeys[0].credentials as CfDestinationServiceCredentials;
    return listBtpDestinations(credentials);
}
