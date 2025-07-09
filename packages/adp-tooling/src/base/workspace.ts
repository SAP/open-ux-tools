import { resolve } from 'path';
import { readFileSync, existsSync } from 'fs';
import { isAppStudio } from '@sap-ux/btp-utils';
import { DestinationAbapTarget, UrlAbapTarget } from '@sap-ux/system-access';

import { getAdpConfig, getProxyConfig, getVariant } from './helper';
import { AdpConfig, DescriptorVariant, AdpProjectData } from '../types';

export async function getAdpProjectData(projectPath: string): Promise<AdpProjectData> {
    try {
        const configExists = existsSync(resolve(projectPath, '.adp', 'config.json'));
        const variant = await getVariant(projectPath);

        return configExists ? getOldConfigBAS(variant, projectPath) : await getConfig(variant, projectPath);
    } catch (e: any) {
        throw new Error(`Unable to get project files: ${e.message}`);
    }
}

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

/* generic file-read helper (unchanged) */
export function parseFile<T>(projectPath: string, filePath: string): T {
    return JSON.parse(readFileSync(resolve(projectPath, filePath), 'utf-8'));
}
