// This script is required by the Fiori pipeline to locate and register reuse libraries.
// The pipeline downloads the reuse libraries and places them in webapp/resources.
(function () {
    "use strict";

    var oScript = document.getElementById("locate-reuse-libs");
    var sManifestUri = oScript && oScript.getAttribute("data-sap-ui-manifest-uri");

    if (!sManifestUri) {
        return;
    }

    var oXhr = new XMLHttpRequest();
    oXhr.open("GET", sManifestUri, false);
    oXhr.send(null);

    if (oXhr.status !== 200) {
        return;
    }

    var oManifest;
    try {
        oManifest = JSON.parse(oXhr.responseText);
    } catch (e) {
        return;
    }

    var oLibs = (oManifest["sap.ui5"] || {})["dependencies"] || {};
    var mLibraries = oLibs["libs"] || {};

    Object.keys(mLibraries).forEach(function (sLib) {
        if (mLibraries[sLib]["lazy"] !== true) {
            var sPath = "../../resources/" + sLib.replace(/\./g, "/");
            var oExistingPath = window["sap-ui-config"] && window["sap-ui-config"]["paths"];
            if (!oExistingPath || !oExistingPath[sLib]) {
                window["sap-ui-config"] = window["sap-ui-config"] || {};
                window["sap-ui-config"]["paths"] = window["sap-ui-config"]["paths"] || {};
                window["sap-ui-config"]["paths"][sLib] = sPath;
            }
        }
    });
}());
