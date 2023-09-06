/* global sap document */

/**
 * Fetch the manifest for all the given application urls and generate a string containing all required custom library ids.
 *
 * @param {string[]} appUrls 
 * @returns {Promise<string>} Promise of a comma separated list of all required libraries.
 */
function fioriToolsGetManifestLibs(appUrls) {
    var result = {};
    // SAPUI5 delivered namespaces from https://ui5.sap.com/#/api/sap
    var ui5Libs = [
        "sap.apf",
        "sap.base",
        "sap.chart",
        "sap.collaboration",
        "sap.f",
        "sap.fe",
        "sap.fileviewer",
        "sap.gantt",
        "sap.landvisz",
        "sap.m",
        "sap.ndc",
        "sap.ovp",
        "sap.rules",
        "sap.suite",
        "sap.tnt",
        "sap.ui",
        "sap.uiext",
        "sap.ushell",
        "sap.uxap",
        "sap.viz",
        "sap.webanalytics",
        "sap.zen"
    ];
    function addKeys(libOrComp, reuseLibsObj) {
        Object.keys(libOrComp).forEach(function (libOrCompKey) {
            // ignore libs or Components that start with SAPUI5 delivered namespaces
            if (!ui5Libs.some(function (substring) { return libOrCompKey === substring || libOrCompKey.startsWith(substring + "."); })) {
                reuseLibsObj[libOrCompKey] = true;
            }
        });
    }

    var promises = [];
    for (const url of appUrls) {
        promises.push(new Promise(function (resolve, _reject) {
            $.ajax(`${url}/manifest.json`)
                .done(function (manifest) {
                    if (manifest) {
                        if (
                            manifest["sap.ui5"] &&
                            manifest["sap.ui5"].dependencies
                        ) {
                            if (manifest["sap.ui5"].dependencies.libs) {
                                addKeys(manifest["sap.ui5"].dependencies.libs, result);
                            }
                            if (manifest["sap.ui5"].dependencies.components) {
                                addKeys(manifest["sap.ui5"].dependencies.components, result);
                            }
                        }
                        if (
                            manifest["sap.ui5"] &&
                            manifest["sap.ui5"].componentUsages
                        ) {
                            addKeys(manifest["sap.ui5"].componentUsages, result);
                        }
                    }
                    resolve();
                })
            })
        );
    }
    return Promise.all(promises).then(() => Object.keys(result).join(','));
};

/**
 * Register the custom libraries and their url with the UI5 loader.
 * @param {*} dataFromAppIndex 
 */
function registerModules(dataFromAppIndex) {
    Object.keys(dataFromAppIndex).forEach(function (moduleDefinitionKey) {
        var moduleDefinition = dataFromAppIndex[moduleDefinitionKey];
        if (moduleDefinition && moduleDefinition.dependencies) {
            moduleDefinition.dependencies.forEach(function (dependency) {
                if (dependency.url && dependency.url.length > 0 && dependency.type === "UI5LIB") {
                    sap.ui.require(["sap/base/Log"], function (Log) {
                        Log.info("Registering Library " +
                            dependency.componentId +
                            " from server " +
                            dependency.url);
                    });
                    var compId = dependency.componentId.replace(/\./g, "/");
                    var config = {
                        paths: {
                        }
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
 * @param {string[]} appUrls application urls
 * @returns {Promise<void>} returns a promise when the registration is completed.
 */
function registerComponentDependencyPaths(appUrls) {
    return fioriToolsGetManifestLibs(appUrls).then(function (libs) {
        if (libs && libs.length > 0) {
            var url = "/sap/bc/ui2/app_index/ui5_app_info?id=" + libs;
            var sapClient = "";

            return new Promise(
                function (resolve) {
                    sap.ui.require(["sap/base/util/UriParameters"], function (UriParameters) {
                        sapClient = UriParameters.fromQuery(window.location.search).get("sap-client");
                        if (sapClient && sapClient.length === 3) {
                            url = url + "&sap-client=" + sapClient;
                        }
                        resolve(url);
                    });
                }).then(function (url2) {
                    return $.ajax(url2).done(function (data) {
                        if (data) {
                            registerModules(data);
                        }
                    });
                });
        } else {
            return undefined;
        }
    });
};

/**
 * Reigster SAP fonts that are also registered in a productive Fiori launchpad
 */
function registerSAPFonts() {  
    sap.ui.require(["sap/ui/core/IconPool"], function (IconPool) {  
    //Fiori Theme font family and URI
    var fioriTheme = {
        fontFamily: "SAP-icons-TNT",
        fontURI: sap.ui.require.toUrl("sap/tnt/themes/base/fonts/")
    };
    //Registering to the icon pool
    IconPool.registerFont(fioriTheme);
    //SAP Business Suite Theme font family and URI
    var bSuiteTheme = {
        fontFamily: "BusinessSuiteInAppSymbols",
        fontURI: sap.ui.require.toUrl("sap/ushell/themes/base/fonts/")
    };
    //Registering to the icon pool
    IconPool.registerFont(bSuiteTheme);
    });
}

/**
 * Read the application title from the resource bundle and set it as document title.
 */
function setI18nTitle() { 
    var sLocale = sap.ui.getCore().getConfiguration().getLanguage();
    sap.ui.require(["sap/base/i18n/ResourceBundle"], function (ResourceBundle) {
        var oResourceBundle = ResourceBundle.create({
            url: "i18n/i18n.properties",
            locale: sLocale
        });
        document.title = oResourceBundle.getText("appTitle");
    });
}

// Register RTA if configured
var bootstrapConfig = document.getElementById("sap-ui-bootstrap");
var flex = bootstrapConfig.getAttribute("data-open-ux-preview-flex-settings");
if (flex) {
    sap.ushell.Container.attachRendererCreatedEvent(function () {
        sap.ushell.Container.getServiceAsync('AppLifeCycle').then((serviceInstance) => {
            serviceInstance.attachAppLoaded((event) => {
                var oView = event.getParameter('componentInstance');
                sap.ui.require(["sap/ui/rta/api/startAdaptation"], function (startAdaptation) {
                    var options = {
                        rootControl: oView,
                        validateAppVersion: false,
                        flexSettings: JSON.parse(flex)
                    };
                    startAdaptation(options);
                });
            })
        });
    });
}

// Load custom library paths if configured
var appUrls = bootstrapConfig.getAttribute("data-open-ux-preview-libs-manifests");
var initPromise = appUrls ? registerComponentDependencyPaths(JSON.parse(appUrls)) : Promise.resolve();
initPromise.catch(function (error) {
    sap.ui.require(["sap/base/Log"], function (Log) {
        Log.error(error);
    });
})
.finally(function() {
    // always set title, register fonts and place the renderer
    setI18nTitle();
    registerSAPFonts();
    sap.ushell.Container.createRenderer().placeAt("content");
});
