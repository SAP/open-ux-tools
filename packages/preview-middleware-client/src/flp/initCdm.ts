import merge from 'sap/base/util/merge';
import { defaultConfig } from 'sap/ushell/bootstrap/cdm/cdm.constants';
import { Window } from 'types/global';

/**
 * Initializes the CDM (Common Data Model) configuration for the SAP Fiori Launchpad.
 *
 * @param {sap.ushell.Container} container - The SAP Fiori Launchpad container.
 * @returns {Promise<void>} A promise that resolves when the initialization is complete.
 */
export default async function initCdm(container: typeof sap.ushell.Container): Promise<void> {
    (window as unknown as Window)['sap-ushell-config'] = merge({}, defaultConfig, {
        renderers: {
            fiori2: {
                componentData: {
                    config: {
                        enablePersonalization: false,
                        enableAppFinder: true
                    }
                }
            }
        },
        ushell: {
            customPreload: {
                enabled: false
            },
            spaces: {
                enabled: true,
                myHome: {
                    enabled: true
                }
            },
            homeApp: {
                component: {
                    name: 'open.ux.preview.client.flp.homepage',
                    url: '/preview/client/flp/homepage'
                }
            }
        },
        services: {
            Container: {
                adapter: {
                    config: {
                        userProfile: {
                            defaults: {
                                email: 'john.doe@sap.com',
                                firstName: 'John',
                                lastName: 'Doe',
                                fullName: 'John Doe',
                                id: 'DOEJ'
                            }
                        }
                    }
                }
            },
            CommonDataModel: {
                adapter: {
                    config: {
                        ignoreSiteDataPersonalization: true,
                        siteDataUrl: '/cdm.json'
                    }
                }
            },
            FlpLaunchPage: {
                adapter: {
                    module: 'sap.ushell.adapters.cdm.v3.FlpLaunchPageAdapter'
                }
            }
        }
    }) as {
        [key: string]: unknown;
    };

    await container.init('cdm');
}
