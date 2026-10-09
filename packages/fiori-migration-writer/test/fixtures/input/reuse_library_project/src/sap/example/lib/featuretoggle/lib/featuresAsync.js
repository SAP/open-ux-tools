/*eslint no-undef: 0*/
jQuery.sap.require('sap.example.lib.featuretoggle.lib.cacheValidator');
sap.ui.define([], function () {
    'use strict';
    /**
     *
     * @returns a Promise with the method to retrieve feature toggle status
     *
     *
     * <h3>Use</h3>
     *
     * Use this method to get the Feature Toggle status in asynchronous mode.
     *
     * <h3>Procedure</h3>
     *
     * Upon calling the method sap.example.lib.featuretoggle.lib.featuresAsync(), a promise is returned.
     * Once the promise is resolved,  specify the Feature Toggle ID for which you require the status in the method getFeatureStatus().
     */
    sap.example.lib.featuretoggle.lib.featuresAsync = function (sEnvironment) {
        if (!sap.example.lib.featuretoggle.lib.cacheValidator.getModel()) {
            //If the Feature toggle model is unset

            if (!sap.example.lib.featuretoggle.lib.cacheValidator.getValidateCache()) {
                //If the features are not cached

                if (!sEnvironment) {
                    //If sEnvironment is undefined, initialize it and call the OData service to fetch all toggle status
                    sap.example.lib.featuretoggle.lib.cacheValidator.setInitialize();
                    return sap.example.lib.featuretoggle.lib.cacheValidator.getDataAsync();
                }
            }
        }

        //If the model is already set, simply resolve the promise
        return new Promise(function (resolve) {
            resolve({
                /**
                 * Returns the feature toggle status for the Feature Id passed
                 * as parameter to this method.
                 * @param {string}  Name of the feature toggle for which status will be returned.
                 * @returns {boolean} Feature Toggle status.
                 */
                getFeatureStatus: function (sFid) {
                    if (sap.example.lib.featuretoggle.lib.cacheValidator.getValueState()) {
                        //Checking Service Availability
                        return sap.example.lib.featuretoggle.lib.cacheValidator.getValueState();
                    }
                    //Checking for the presence of sFid in the model
                    var oModel = sap.example.lib.featuretoggle.lib.cacheValidator.getModel();
                    var iLen = oModel.length;
                    for (var iFeatureList = 0; iFeatureList < iLen; iFeatureList++) {
                        if (oModel[iFeatureList].Featureid.toUpperCase() === sFid.toUpperCase()) {
                            return false;
                        }
                    }
                    return true;
                }
            });
        });
    };
});
