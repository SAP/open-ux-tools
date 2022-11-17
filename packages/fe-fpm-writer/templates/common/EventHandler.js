sap.ui.define([
    "sap/m/MessageToast"
], function(MessageToast) {
    'use strict';

    return {
        <%- (typeof eventHandlerFnName !== 'undefined' && eventHandlerFnName) || 'onPress' %>: function(oEvent) {
            MessageToast.show("Custom handler invoked.");
        }
    };
});
