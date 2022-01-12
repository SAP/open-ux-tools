
/**
 * eslint-disable @sap/ui5-jsdocs/no-jsdoc
 */
sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/ui/Device"
],
/**
 * @param {typeof sap.ui.model.json.JSONModel} JSONModel 
 * @param {typeof sap.ui.Device} Device 
 */
function (JSONModel, Device) {
    "use strict";

    return {

        createDeviceModel: function () {
            var oModel = new JSONModel(Device);
            oModel.setDefaultBindingMode("OneWay");
            return oModel;
        }

    };
});