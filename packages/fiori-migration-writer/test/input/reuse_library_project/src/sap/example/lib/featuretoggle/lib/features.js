/* FTGL UI Lib-Synchronous API which is deprecated  */
jQuery.sap.require('sap.s4h.cfnd.featuretoggle.lib.cacheValidator');
sap.ui.define([], function () {
    'use strict';
    sap.s4h.cfnd.featuretoggle.lib.features = function (sEnvironment) {
        if (!sap.s4h.cfnd.featuretoggle.lib.cacheValidator.getModel()) {
            if (!sap.s4h.cfnd.featuretoggle.lib.cacheValidator.getValidateCache()) {
                if (!sEnvironment) {
                    sap.s4h.cfnd.featuretoggle.lib.cacheValidator.setInitialize();
                }
                sap.s4h.cfnd.featuretoggle.lib.cacheValidator.getData();
            }
        }

        return {
            getFeatureStatus: function (sFid) {
                //Service availabiilty
                if (sap.s4h.cfnd.featuretoggle.lib.cacheValidator.getValueState()) {
                    return sap.s4h.cfnd.featuretoggle.lib.cacheValidator.getValueState();
                }
                if (!sap.s4h.cfnd.featuretoggle.lib.cacheValidator.getCacheStatus()) {
                    sap.s4h.cfnd.featuretoggle.lib.cacheValidator.getData();
                }
                if (!sap.s4h.cfnd.featuretoggle.lib.cacheValidator.getModel()) {
                    return false;
                }
                var oModel = sap.s4h.cfnd.featuretoggle.lib.cacheValidator.getModel();
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
