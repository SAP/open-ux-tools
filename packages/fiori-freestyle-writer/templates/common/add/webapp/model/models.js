sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/ui/Device"
], (JSONModel, Device) => {
    "use strict";

    return {
        /**
         * Provides runtime info for the device the UI5 app is running on as JSONModel
         */
        createDeviceModel() {
            const oModel = new JSONModel(Device);
            oModel.setDefaultBindingMode("OneWay");
            return oModel;
        }
    };

});