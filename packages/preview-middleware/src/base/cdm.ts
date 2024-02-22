import { readFileSync } from 'fs';
import { join } from 'path';
import type { TemplateConfig } from './flp';

/**
 * Generate CDM based on the given apps.
 *
 * @param apps list of app tiles.
 * @returns CDM JSON as string.
 */
export function generateCdm(apps: TemplateConfig['apps']): string {
    const cdm = JSON.parse(readFileSync(join(__dirname, '../../templates/flp/cdm.base.json'), 'utf-8'));
    // add apps
    Object.keys(apps).forEach((id) => {
        const appId = apps[id].additionalInformation.split('=')[1];
        const [object, action] = id.split('-');
        const { title, description, url } = apps[id];
        cdm.groups['group:examples'].payload.tiles.push({
            id: `group:examples:${object}-${action}`,
            vizId: `${object}-${action}`
        });

        cdm.catalogs['catalog:examples'].payload.viz.push(`${object}-${action}`);

        cdm.visualizations[`${object}-${action}`] = {
            'vizType': 'sap.ushell.StaticAppLauncher',
            'businessApp': appId,
            'vizConfig': {
                'sap.app': {
                    title,
                    subTitle: description
                },
                'sap.ui': {
                    'icons': {
                        'icon': ''
                    }
                },
                'sap.flp': {
                    'tileSize': '1x1',
                    'numberUnit': '',
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
                            'info': '',
                            'signature': {
                                'parameters': {},
                                'additionalParameters': 'allowed'
                            }
                        }
                    }
                }
            },
            'sap.ui5': {
                'componentName': appId
            },
            'sap.flp': {
                'type': 'application'
            },
            'sap.ui': {
                'technology': 'UI5',
                'deviceTypes': {
                    'desktop': true,
                    'tablet': true,
                    'phone': false
                }
            },
            'sap.platform.runtime': {
                'componentProperties': {
                    url,
                    'asyncHints': {}
                }
            }
        };

        cdm.pages.Preview.payload.sections['section:examples'].layout.vizOrder.push(`${object}-${action}`);
        cdm.pages.Preview.payload.sections['section:examples'].viz[`${object}-${action}`] = {
            id: `${object}-${action}`,
            vizId: `${object}-${action}`
        };
    });

    return cdm;
}
