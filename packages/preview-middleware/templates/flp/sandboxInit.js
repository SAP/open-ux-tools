/* global sap document */
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
 * Registers the module paths for dependencies of the given component.
 * @param {string} manifestPath The the path to the app manifest path
 * for which the dependencies should be registered.
 * @returns {Promise} A promise which is resolved when the ajax request for
 * the app-index was successful and the module paths were registered.
 */
registerComponentDependencyPaths = function (appUrls) {
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

// setting the app title with internationalization 
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

var appUrls = bootstrapConfig.getAttribute("data-open-ux-preview-libs-manifests");
var initPromise = appUrls ? registerComponentDependencyPaths(JSON.parse(appUrls)) : Promise.resolve();
initPromise.catch(function (error) {
    sap.ui.require(["sap/base/Log"], function (Log) {
        Log.error(error);
    });
})
.finally(function() {
    setI18nTitle();
    registerSAPFonts();
    sap.ushell.Container.createRenderer().placeAt("content");
});
