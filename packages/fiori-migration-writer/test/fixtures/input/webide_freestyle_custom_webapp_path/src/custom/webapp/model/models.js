sap.ui.define(['sap/ui/model/json/JSONModel', 'sap/ui/Device'], function (JSONModel, Device) {
    'use strict';

    return {
        createDeviceModel: function () {
            var oModel = new JSONModel(Device);
            oModel.setDefaultBindingMode('OneWay');
            return oModel;
        },

        createFLPModel: function () {
            var fnGetUser = jQuery.sap.getObject('sap.ushell.Container.getUser');
            var oModel = new JSONModel({
                isShareInJamActive: fnGetUser ? fnGetUser().isJamActive() : false
            });
            oModel.setDefaultBindingMode('OneWay');
            return oModel;
        }
    };
});
