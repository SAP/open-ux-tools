sap.ui.define([
    "sap/m/MessageToast"
], function(MessageToast) {
    'use strict';

    return {
        <%- eventHandlerFnName %>: function(oEvent) {
            MessageToast.show("Custom handler invoked.");
        }
    };
});
