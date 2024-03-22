import Log from 'sap/base/Log';
import type AppLifeCycle from 'sap/ushell/services/AppLifeCycle';
import type { InitRtaScript, RTAPlugin, StartAdaptation } from 'sap/ui/rta/api/startAdaptation';
import type { RTAOptions } from 'sap/ui/rta/RuntimeAuthoring';
import IconPool from 'sap/ui/core/IconPool';
import ResourceBundle from 'sap/base/i18n/ResourceBundle';
import UriParameters from 'sap/base/util/UriParameters';

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
 * Check whether a specific dependency is a custom library, and if yes, add it to the map.
 *
 * @param dependency dependency from the manifest
 * @param customLibs map containing the required custom libraries
 */
function addKeys(dependency: Record<string, unknown>, customLibs: Record<string, true>): void {
    Object.keys(dependency).forEach(function (key) {
        // ignore libs or Components that start with SAPUI5 delivered namespaces
        if (
            !UI5_LIBS.some(function (substring) {
                return key === substring || key.startsWith(substring + '.');
            })
        ) {
            customLibs[key] = true;
        }
    });
}

/**
 * Fetch the manifest for all the given application urls and generate a string containing all required custom library ids.
 *
 * @param appUrls urls pointing to included applications
 * @returns Promise of a comma separated list of all required libraries.
 */
function getManifestLibs(appUrls: string[]): Promise<string> {
    const result = {} as Record<string, true>;
    const promises = [];
    for (const url of appUrls) {
        promises.push(
            fetch(`${url}/manifest.json`).then(async (resp) => {
                const manifest = await resp.json();
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
            })
        );
    }
    return Promise.all(promises).then(() => Object.keys(result).join(','));
}

/**
 * Register the custom libraries and their url with the UI5 loader.
 *
 * @param dataFromAppIndex data returned from the app index service
 */
function registerModules(
    dataFromAppIndex: Record<
        string,
        {
            dependencies?: {
                url?: string;
                type?: string;
                componentId: string;
            }[];
        }
    >
) {
    Object.keys(dataFromAppIndex).forEach(function (moduleDefinitionKey) {
        const moduleDefinition = dataFromAppIndex[moduleDefinitionKey];
        if (moduleDefinition && moduleDefinition.dependencies) {
            moduleDefinition.dependencies.forEach(function (dependency) {
                if (dependency.url && dependency.url.length > 0 && dependency.type === 'UI5LIB') {
                    Log.info('Registering Library ' + dependency.componentId + ' from server ' + dependency.url);
                    const compId = dependency.componentId.replace(/\./g, '/');
                    const config = {
                        paths: {} as Record<string, string>
                    };
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
 * @param appUrls application urls
 * @returns returns a promise when the registration is completed.
 */
export async function registerComponentDependencyPaths(appUrls: string[]): Promise<void> {
    const libs = await getManifestLibs(appUrls);
    if (libs && libs.length > 0) {
        let url = '/sap/bc/ui2/app_index/ui5_app_info?id=' + libs;
        const sapClient = UriParameters.fromQuery(window.location.search).get('sap-client');
        if (sapClient && sapClient.length === 3) {
            url = url + '&sap-client=' + sapClient;
        }
        const response = await fetch(url);
        try {
            registerModules(await response.json());
        } catch (error) {
            Log.error(`Registering of reuse libs failed. Error:${error}`);
        }
    }
}

/**
 * Register SAP fonts that are also registered in a productive Fiori launchpad.
 */
export function registerSAPFonts() {
    //Fiori Theme font family and URI
    const fioriTheme = {
        fontFamily: 'SAP-icons-TNT',
        fontURI: sap.ui.require.toUrl('sap/tnt/themes/base/fonts/')
    };
    //Registering to the icon pool
    IconPool.registerFont(fioriTheme);
    //SAP Business Suite Theme font family and URI
    const suiteTheme = {
        fontFamily: 'BusinessSuiteInAppSymbols',
        fontURI: sap.ui.require.toUrl('sap/ushell/themes/base/fonts/')
    };
    //Registering to the icon pool
    IconPool.registerFont(suiteTheme);
}

/**
 * Read the application title from the resource bundle and set it as document title.
 *
 * @param i18nKey optional parameter to define the i18n key to be used for the title.
 */
export function setI18nTitle(i18nKey = 'appTitle') {
    const locale = sap.ui.getCore().getConfiguration().getLanguage();
    const resourceBundle = ResourceBundle.create({
        url: 'i18n/i18n.properties',
        locale
    }) as ResourceBundle;
    if (resourceBundle.hasText(i18nKey)) {
        document.title = resourceBundle.getText(i18nKey) ?? document.title;
    }
}

/**
 * Apply additional configuration and initialize sandbox.
 *
 * @param params init parameters read from the script tag
 * @param params.appUrls JSON containing a string array of application urls
 * @param params.flex JSON containing the flex configuration
 * @param params.customInit path to the custom init module to be called
 * @returns promise
 */
export async function init({
    appUrls,
    flex,
    customInit
}: {
    appUrls?: string | null;
    flex?: string | null;
    customInit?: string | null;
}): Promise<void> {
    // Register RTA if configured
    if (flex) {
        sap.ushell.Container.attachRendererCreatedEvent(async function () {
            const lifecycleService = await sap.ushell.Container.getServiceAsync<AppLifeCycle>('AppLifeCycle');
            lifecycleService.attachAppLoaded((event) => {
                const version = sap.ui.version;
                const minor = parseInt(version.split('.')[1], 10);
                const view = event.getParameter('componentInstance');
                const flexSettings = JSON.parse(flex);
                const pluginScript = flexSettings.pluginScript ?? '';

                let libs: string[] = [];
                if (minor > 71) {
                    libs.push('sap/ui/rta/api/startAdaptation');
                } else {
                    libs.push('open/ux/preview/client/flp/initRta');
                }

                if (flexSettings.pluginScript) {
                    libs.push(pluginScript);
                    delete flexSettings.pluginScript;
                }

                const options: RTAOptions = {
                    rootControl: view,
                    validateAppVersion: false,
                    flexSettings
                };

                sap.ui.require(
                    libs,
                    async function (startAdaptation: StartAdaptation | InitRtaScript, pluginScript: RTAPlugin) {
                        await startAdaptation(options, pluginScript);
                    }
                );
            });
        });
    }

    // Load custom library paths if configured
    if (appUrls) {
        await registerComponentDependencyPaths(JSON.parse(appUrls));
    }

    // Load custom initialization module
    if (customInit) {
        sap.ui.require([customInit]);
    }

    // init
    setI18nTitle();
    registerSAPFonts();
    const renderer = await sap.ushell.Container.createRenderer(undefined, true);
    renderer.placeAt('content');
}

const bootstrapConfig = document.getElementById('sap-ui-bootstrap');
if (bootstrapConfig) {
    init({
        appUrls: bootstrapConfig.getAttribute('data-open-ux-preview-libs-manifests'),
        flex: bootstrapConfig.getAttribute('data-open-ux-preview-flex-settings'),
        customInit: bootstrapConfig.getAttribute('data-open-ux-preview-customInit')
    }).catch(() => Log.error('Sandbox initialization failed.'));
}
