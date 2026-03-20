import type { Window } from 'types/global';

/**
 * Initializes the CDM (Common Data Model) configuration for the SAP Fiori Launchpad.
 *
 */
(window as unknown as Window)['sap-ushell-config'] = {
    defaultRenderer: 'fiori2',
    renderers: {
        fiori2: {
            componentData: {
                config: {
                    enableSearch: false,
                    enableSetLanguage: true,
                    enableRecentActivity: true,
                    rootIntent: 'Shell-home'
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
                        metadata: {
                            editablePropterties: ['accessibility', 'contentDensity', 'theme']
                        },
                        defaults: {
                            email: 'user.name@example.com',
                            firstName: 'User',
                            lastName: 'Name',
                            fullName: 'User Name',
                            id: 'USERNAME'
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
        Personalization: {
            adapter: {
                module: 'sap.ushell.adapters.local.PersonalizationAdapter',
                config: {
                    storageType: 'MEMORY'
                }
            }
        },
        PersonalizationV2: {
            adapter: {
                module: 'sap.ushell.adapters.local.PersonalizationAdapter',
                config: {
                    storageType: 'MEMORY'
                }
            }
        },
        AppState: {
            adapter: {
                module: 'sap.ushell.adapters.local.AppStateAdapter'
            },
            config: {
                transient: true
            }
        },
        NavTargetResolutionInternal: {
            config: {
                allowTestUrlComponentConfig: false,
                enableClientSideTargetResolution: true
            },
            adapter: {
                module: 'sap.ushell.adapters.local.NavTargetResolutionInternalAdapter'
            }
        },
        UserInfo: {
            adapter: {
                module: 'sap.ushell.adapters.local.UserInfoAdapter'
            }
        },
        FlpLaunchPage: {
            adapter: {
                module: 'sap.ushell.adapters.cdm.v3.FlpLaunchPageAdapter'
            }
        }
    }
};
