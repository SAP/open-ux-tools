/* FTGL UI Lib-Synchronous API which is deprecated  */
jQuery.sap.require('sap.example.lib.featuretoggle.lib.cacheValidator');
sap.ui.define([], function () {
    'use strict';
    sap.example.lib.featuretoggle.lib.features = function (sEnvironment) {
        if (!sap.example.lib.featuretoggle.lib.cacheValidator.getModel()) {
            if (!sap.example.lib.featuretoggle.lib.cacheValidator.getValidateCache()) {
                if (!sEnvironment) {
                    sap.example.lib.featuretoggle.lib.cacheValidator.setInitialize();
                }
                sap.example.lib.featuretoggle.lib.cacheValidator.getData();
            }
        }

        return {
            getFeatureStatus: function (sFid) {
                //Service availabiilty
                if (sap.example.lib.featuretoggle.lib.cacheValidator.getValueState()) {
                    return sap.example.lib.featuretoggle.lib.cacheValidator.getValueState();
                }
                if (!sap.example.lib.featuretoggle.lib.cacheValidator.getCacheStatus()) {
                    sap.example.lib.featuretoggle.lib.cacheValidator.getData();
                }
                if (!sap.example.lib.featuretoggle.lib.cacheValidator.getModel()) {
                    return false;
                }
                var oModel = sap.example.lib.featuretoggle.lib.cacheValidator.getModel();
                var iLen = oModel.length;
                for (var iFeatureList = 0; iFeatureList < iLen; iFeatureList++) {
                    if (oModel[iFeatureList].Featureid.toUpperCase() === sFid.toUpperCase()) {
                        return false;
                    }
                }
                return true;
            }
        };
    };
});
