sap.ui.define(
    [
        'jquery.sap.global',
        'sap/ui/core/mvc/Controller',
        'sap/ui/model/json/JSONModel',
        'sap/m/MessageToast',
        'sap/fe/core/controllerextensions/FlexibleColumnLayout',
        'sap/fe/core/controllerextensions/Routing'
    ],
    function(jQuery, Controller, JSONModel, MessageToast, FCLExtension, RoutingExtension) {
        'use strict';

        return Controller.extend('sap.fe.demo.incidents.ext.controller.ProcessFlow', {
            fcl: FCLExtension,
            routing: RoutingExtension,

            onInit: function() {
                var oView = this.getView();
                this.oProcessFlow1 = oView.byId('processflow1');

                var sDataPath = jQuery.sap.getModulePath(
                    'sap.fe.demo.incidents.ext.controller',
                    '../../../../../common/data.json'
                );
                var oModelPf1 = new JSONModel(sDataPath);
                oView.setModel(oModelPf1, 'ProcessFlowModel');
                oModelPf1.attachRequestCompleted(this.oProcessFlow1.updateModel.bind(this.oProcessFlow1));
            },

            onNodePress: function(event) {
                MessageToast.show('Node ' + event.getParameters().getNodeId() + ' has been clicked.');
            }
        });
    }
);
