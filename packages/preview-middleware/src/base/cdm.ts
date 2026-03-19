import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CdmAdditionalConfig, TemplateConfig } from './config';
import { type FLPCdmConfig, FLPHomePageDefaults } from '../types';

type FlpTarget = {
    type?: string;
    url?: string;
    appId?: string;
    inboundId?: string;
    parameters?: { name: string; value: string }[];
};

/**
 * Creates an inbound-based FLP visualization target (standard app tile).
 *
 * @param appId - application id
 * @param inboundId - inbound identifier (object-action)
 * @returns visualization target configuration
 */
function createInboundTarget(appId: string, inboundId: string): FlpTarget {
    return {
        appId,
        inboundId,
        parameters: [{ name: 'sap-ui-tech-hint', value: 'UI5' }]
    };
}

/**
 * Creates a URL-based FLP visualization target (configuration path tile).
 *
 * @param url - the target URL
 * @returns visualization target configuration
 */
function createUrlTarget(url: string): FlpTarget {
    return { type: 'URL', url };
}

/**
 * Registers an app entry in the CDM: adds it to the catalog, visualizations, applications, and the homepage section.
 *
 * @param cdm - the CDM configuration to modify
 * @param options - app registration options
 * @param options.appId - unique application identifier
 * @param options.object - semantic object
 * @param options.action - semantic action
 * @param options.title - tile title
 * @param options.subTitle - tile subtitle
 * @param options.url - application URL
 * @param options.flpTarget - FLP target configuration (inbound or URL based)
 */
function addCdmEntry(
    cdm: FLPCdmConfig,
    {
        appId,
        object,
        action,
        title,
        subTitle,
        url,
        flpTarget
    }: {
        appId: string;
        object: string;
        action: string;
        title: string;
        subTitle: string;
        url: string;
        flpTarget: FlpTarget;
    }
): void {
    const vizId = `VIZ:${appId}`;
    const section = cdm.pages[FLPHomePageDefaults.pageName].payload.sections[FLPHomePageDefaults.sectionId];

    cdm.catalogs[FLPHomePageDefaults.catalogId].payload.viz.push(vizId);

    cdm.visualizations[vizId] = {
        vizType: 'sap.ushell.StaticAppLauncher',
        businessApp: appId,
        vizConfig: {
            'sap.app': { title, subTitle },
            'sap.flp': { target: flpTarget }
        }
    };

    cdm.applications[appId] = {
        'sap.app': {
            id: appId,
            title,
            crossNavigation: {
                inbounds: {
                    [`${object}-${action}`]: {
                        semanticObject: object,
                        action,
                        title,
                        subTitle,
                        signature: { additionalParameters: 'allowed' }
                    }
                }
            }
        },
        'sap.ui5': { componentName: appId },
        'sap.ui': { technology: 'UI5' },
        'sap.platform.runtime': {
            componentProperties: { url, asyncHints: {} }
        }
    };

    section.layout.vizOrder.push(appId);
    section.viz[appId] = { id: appId, vizId };
}

/**
 * Generates a CDM by embedding the provided app tiles into the FLP homepage.
 *
 * @param apps - A list of app to be embedded.
 * @param additionalConfig - Additional CDM configuration for generating configuration-specific tiles
 * @returns The generated CDM configuration
 */
export function generateCdm(apps: TemplateConfig['apps'] = {}, additionalConfig: CdmAdditionalConfig): FLPCdmConfig {
    const cdm = JSON.parse(readFileSync(join(__dirname, '../../templates/flp/cdm.base.json'), 'utf-8')) as FLPCdmConfig;

    Object.keys(apps).forEach((id) => {
        const appId = apps[id].additionalInformation.split('=')[1];
        const [object, action] = id.split('-');
        const { title, description, url } = apps[id];

        addCdmEntry(cdm, {
            appId,
            object,
            action,
            title,
            subTitle: description,
            url,
            flpTarget: createInboundTarget(appId, `${object}-${action}`)
        });

        if (object === additionalConfig.intent.object && action === additionalConfig.intent.action) {
            for (const configPath of additionalConfig.configurationPaths) {
                const configAppId = `${appId}-${configPath.name.replace(/\s/g, '')}`;
                const targetUrl =
                    configPath.type === 'editor' ? `${configPath.path}#${object}-${action}` : configPath.path;

                addCdmEntry(cdm, {
                    appId: configAppId,
                    object,
                    action,
                    title,
                    subTitle: configPath.name,
                    url,
                    flpTarget: createUrlTarget(targetUrl)
                });
            }
        }
    });

    return cdm;
}
