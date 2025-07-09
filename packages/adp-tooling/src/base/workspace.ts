import { resolve } from 'path';
import { readFileSync, existsSync } from 'fs';

import { isAppStudio } from '@sap-ux/btp-utils';
import type { DestinationAbapTarget, UrlAbapTarget } from '@sap-ux/system-access';

import { getAdpConfig, getProxyConfig, getVariant } from './helper';
import type { AdpConfig, DescriptorVariant, AdpProjectData } from '../types';

/**
 * Get the project data for the adaptation project.
 *
 * @param {string} projectPath - The path to the adaptation project.
 * @returns {Promise<AdpProjectData>} The project data.
 */
export async function getAdpProjectData(projectPath: string): Promise<AdpProjectData> {
    try {
        const configExists = existsSync(resolve(projectPath, '.adp', 'config.json'));
        const variant = await getVariant(projectPath);

        return configExists ? getOldConfigBAS(variant, projectPath) : await getConfig(variant, projectPath);
    } catch (e) {
        throw new Error(`Unable to get project files: ${e.message}`);
    }
}

/**
 * Reads `.adp/config.json` (legacy BAS workspace) and maps it to
 * `AdpProjectData` plus information from the descriptor variant.
 *
 * @param {DescriptorVariant} variant - Parsed `manifest.appdescr_variant`
 * @param {string} projectPath - Project root
 * @returns {AdpProjectData} Legacy BAS project data mapping
 */
function getOldConfigBAS(variant: DescriptorVariant, projectPath: string): AdpProjectData {
    const config: AdpConfig = JSON.parse(readFileSync(resolve(projectPath, '.adp/config.json'), 'utf-8'));

    return {
        path: projectPath,
        title: projectPath.split('/').pop() ?? '',
        namespace: variant.namespace,
        name: config.appvariant,
        layer: variant.layer,
        environment: config.environment,
        sourceSystem: config.sourceSystem ?? '',
        applicationIdx: variant.reference,
        reference: variant.reference,
        id: variant.id,
        ui5Version: config.ui5Version,
        cfApiUrl: config?.cfApiUrl,
        cfOrganization: config?.cfOrganization,
        cfSpace: config?.cfSpace
    };
}

/**
 * Creates an `AdpProjectData` object for projects that rely on `ui5.yaml` middleware configuration.
 *
 * @param {DescriptorVariant} variant - Parsed `manifest.appdescr_variant`
 * @param {string} projectPath - Project root
 * @returns {Promise<AdpProjectData>} Project data extracted from ui5.yaml configuration
 */
async function getConfig(variant: DescriptorVariant, projectPath: string): Promise<AdpProjectData> {
    if (!existsSync(resolve(projectPath, 'ui5.yaml'))) {
        throw new Error('Missing ui5.yaml!');
    }

    const ui5yamlPath = resolve(projectPath, 'ui5.yaml');
    const fioriProxyConfig = await getProxyConfig(projectPath, ui5yamlPath);
    const ui5Version = fioriProxyConfig.ui5?.version ?? '';

    const adpConfig = await getAdpConfig(projectPath, ui5yamlPath);
    const { client, destination, url, authenticationType } = adpConfig.target as DestinationAbapTarget & UrlAbapTarget;

    const sourceSystem = isAppStudio() ? destination : url;

    return {
        path: projectPath,
        title: projectPath.split('/').pop() ?? '',
        namespace: variant.namespace,
        name: variant.id.startsWith('customer.') ? variant.id.replace(/customer./, '') : variant.id,
        layer: variant.layer,
        environment: 'ABAP',
        sourceSystem,
        client,
        applicationIdx: variant.reference,
        reference: variant.reference,
        id: variant.id,
        ui5Version,
        authenticationType
    };
}
