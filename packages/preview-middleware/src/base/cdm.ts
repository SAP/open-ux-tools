import { readFileSync } from 'fs';
import { join } from 'path';
import type { TemplateConfig } from './config';
import { type FLPCdmConfig, FLPHomePageDefaults } from '../types';

/**
 * Generates a CDM by embedding the provided app tiles into the FLP homepage.
 *
 * @param apps - A list of app to be embedded.
 * @returns The generated CDM configuration
 */
export function generateCdm(apps: TemplateConfig['apps'] = {}): FLPCdmConfig {
    const cdm = JSON.parse(readFileSync(join(__dirname, '../../templates/flp/cdm.base.json'), 'utf-8')) as FLPCdmConfig;

    // add apps
    Object.keys(apps).forEach((id) => {
        const appId = apps[id].additionalInformation.split('=')[1];
        const vizId = `VIZ:${appId}`;
        const [object, action] = id.split('-');
        const { title, description, url } = apps[id];

        // add app to default catalog
        cdm.catalogs[FLPHomePageDefaults.catalogId].payload.viz.push(vizId);

        // create flp visualization
        cdm.visualizations[vizId] = {
            'vizType': 'sap.ushell.StaticAppLauncher',
            'businessApp': appId,
            'vizConfig': {
                'sap.app': {
                    title,
                    subTitle: description
                },
                'sap.flp': {
                    'target': {
                        'appId': appId,
                        'inboundId': `${object}-${action}`,
                        'parameters': [
                            {
                                'name': 'sap-ui-tech-hint',
                                'value': 'UI5'
                            }
                        ]
                    }
                }
            }
        };

        // create flp application
        cdm.applications[appId] = {
            'sap.app': {
                id: appId,
                title,
                crossNavigation: {
                    inbounds: {
                        [`${object}-${action}`]: {
                            'semanticObject': object,
                            'action': action,
                            title,
                            'subTitle': description,
                            'signature': {
                                'additionalParameters': 'allowed'
                            }
                        }
                    }
                }
            },
            'sap.ui5': {
                'componentName': appId
            },
            'sap.ui': {
                'technology': 'UI5'
            },
            'sap.platform.runtime': {
                'componentProperties': {
                    url,
                    'asyncHints': {}
                }
            }
        };

        // add app to default section
        cdm.pages[FLPHomePageDefaults.pageName].payload.sections[FLPHomePageDefaults.sectionId].layout.vizOrder.push(
            appId
        );
        cdm.pages[FLPHomePageDefaults.pageName].payload.sections[FLPHomePageDefaults.sectionId].viz[appId] = {
            id: appId,
            vizId
        };
    });

    return cdm;
}
