/* global $ document */

import Log from 'sap/base/Log';
import type Event from 'sap/ui/base/Event';
import type Control from 'sap/ui/core/Control';

/**
 * SAPUI5 delivered namespaces from https://ui5.sap.com/#/api/sap
 */
const UI5_LIBS = [
    'sap.apf',
    'sap.base',
    'sap.chart',
    'sap.collaboration',
    'sap.f',
    'sap.fe',
    'sap.fileviewer',
    'sap.gantt',
    'sap.landvisz',
    'sap.m',
    'sap.ndc',
    'sap.ovp',
    'sap.rules',
    'sap.suite',
    'sap.tnt',
    'sap.ui',
    'sap.uiext',
    'sap.ushell',
    'sap.uxap',
    'sap.viz',
    'sap.webanalytics',
    'sap.zen'
];

/**
 *
 * @param libOrComp
 * @param reuseLibsObj
 */
function addKeys(libOrComp: object, reuseLibsObj: Record<string, boolean>) {
    Object.keys(libOrComp).forEach(function (libOrCompKey) {
        // ignore libs or Components that start with SAPUI5 delivered namespaces
        if (
            !UI5_LIBS.some(function (substring) {
                return libOrCompKey === substring || libOrCompKey.startsWith(substring + '.');
            })
        ) {
            reuseLibsObj[libOrCompKey] = true;
        }
    });
}

/**
 * Fetch the manifest for all the given application urls and generate a string containing all required custom library ids.
 *
 * @param {string[]} appUrls
 * @returns {Promise<string>} Promise of a comma separated list of all required libraries.
 */
function fioriToolsGetManifestLibs(appUrls: any) {
    const result = {} as Record<string, true>;
    const promises = [];
    for (const url of appUrls) {
        promises.push(
            new Promise<void>(function (resolve, _reject) {
                // @ts-ignore
                $.ajax(`${url}/manifest.json`).done(function (manifest: any) {
                    if (manifest) {
                        if (manifest['sap.ui5'] && manifest['sap.ui5'].dependencies) {
                            if (manifest['sap.ui5'].dependencies.libs) {
                                addKeys(manifest['sap.ui5'].dependencies.libs, result);
                            }
                            if (manifest['sap.ui5'].dependencies.components) {
                                addKeys(manifest['sap.ui5'].dependencies.components, result);
                            }
                        }
                        if (manifest['sap.ui5'] && manifest['sap.ui5'].componentUsages) {
                            addKeys(manifest['sap.ui5'].componentUsages, result);
                        }
                    }
                    resolve();
                });
            })
        );
    }
    return Promise.all(promises).then(() => Object.keys(result).join(','));
}

/**
 * Register the custom libraries and their url with the UI5 loader.
 *
 * @param {*} dataFromAppIndex
 */
function registerModules(dataFromAppIndex: any) {
    Object.keys(dataFromAppIndex).forEach(function (moduleDefinitionKey) {
        const moduleDefinition = dataFromAppIndex[moduleDefinitionKey];
        if (moduleDefinition && moduleDefinition.dependencies) {
            moduleDefinition.dependencies.forEach(function (dependency: any) {
                if (dependency.url && dependency.url.length > 0 && dependency.type === 'UI5LIB') {
                    Log.info('Registering Library ' + dependency.componentId + ' from server ' + dependency.url);
                    const compId = dependency.componentId.replace(/\./g, '/');
                    const config = {
                        paths: {}
                    } as any;
                    config.paths[compId] = dependency.url;
                    sap.ui.loader.config(config);
                }
            });
        }
    });
}

/**
 * Fetch the manifest from the given application urls, then parse them for custom libs, and finally request their urls.
 *
 * @param {string[]} appUrls application urls
 * @returns {Promise<void>} returns a promise when the registration is completed.
 */
function registerComponentDependencyPaths(appUrls: string[]) {
    return fioriToolsGetManifestLibs(appUrls).then(function (libs) {
        if (libs && libs.length > 0) {
            let url = '/sap/bc/ui2/app_index/ui5_app_info?id=' + libs;
            let sapClient = '';

            return new Promise(function (resolve) {
                sap.ui.require(['sap/base/util/UriParameters'], function (UriParameters: any) {
                    sapClient = UriParameters.fromQuery(window.location.search).get('sap-client');
                    if (sapClient && sapClient.length === 3) {
                        url = url + '&sap-client=' + sapClient;
                    }
                    resolve(url);
                });
            }).then(function (url2) {
                // @ts-ignore
                return $.ajax(url2).done(function (data: any) {
                    if (data) {
                        registerModules(data);
                    }
                });
            });
        } else {
            return undefined;
        }
    });
}

/**
 * Register SAP fonts that are also registered in a productive Fiori launchpad.
 */
function registerSAPFonts() {
    sap.ui.require(['sap/ui/core/IconPool'], function (IconPool: any) {
        //Fiori Theme font family and URI
        const fioriTheme = {
            fontFamily: 'SAP-icons-TNT',
            fontURI: sap.ui.require.toUrl('sap/tnt/themes/base/fonts/')
        };
        //Registering to the icon pool
        IconPool.registerFont(fioriTheme);
        //SAP Business Suite Theme font family and URI
        const bSuiteTheme = {
            fontFamily: 'BusinessSuiteInAppSymbols',
            fontURI: sap.ui.require.toUrl('sap/ushell/themes/base/fonts/')
        };
        //Registering to the icon pool
        IconPool.registerFont(bSuiteTheme);
    });
}

/**
 * Read the application title from the resource bundle and set it as document title.
 */
function setI18nTitle() {
    const sLocale = sap.ui.getCore().getConfiguration().getLanguage();
    sap.ui.require(['sap/base/i18n/ResourceBundle'], function (ResourceBundle: any) {
        const oResourceBundle = ResourceBundle.create({
            url: 'i18n/i18n.properties',
            locale: sLocale
        });
        document.title = oResourceBundle.getText('appTitle');
    });
}

/**
 * Initialization function.
 *
 * @param params init parameters read from the script tag
 * @param params.appUrls JSON containing a string array of application urls
 * @param params.flex JSON containing the flex configuration
 */
async function init({ appUrls, flex }: { appUrls: string | null; flex: string | null }) {
    // Register RTA if configured
    if (flex) {
        sap.ushell.Container.attachRendererCreatedEvent(async function () {
            const serviceInstance = await sap.ushell.Container.getServiceAsync<any>('AppLifeCycle');
            serviceInstance.attachAppLoaded((event: Event<{ componentInstance: Control }>) => {
                const oView = event.getParameter('componentInstance');
                sap.ui.require(['sap/ui/rta/api/startAdaptation'], function (startAdaptation: Function) {
                    const options = {
                        rootControl: oView,
                        validateAppVersion: false,
                        flexSettings: JSON.parse(flex)
                    };
                    startAdaptation(options);
                });
            });
        });
    }

    // Load custom library paths if configured
    const initPromise = appUrls ? registerComponentDependencyPaths(JSON.parse(appUrls)) : Promise.resolve();
    try {
        await initPromise;
    } catch (error) {
        Log.error(error);
    }
    setI18nTitle();
    registerSAPFonts();
    sap.ushell.Container.createRenderer().placeAt('content');
}

const bootstrapConfig = document.getElementById('sap-ui-bootstrap');
if (bootstrapConfig) {
    init({
        appUrls: bootstrapConfig.getAttribute('data-open-ux-preview-libs-manifests'),
        flex: bootstrapConfig.getAttribute('data-open-ux-preview-flex-settings')
    })
        .then(() => Log.info('Sandbox initialization finished.'))
        .catch(() => Log.error('Sandbox initialization failed.'));
}
