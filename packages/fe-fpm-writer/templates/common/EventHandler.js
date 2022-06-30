sap.ui.define([
    "sap/m/MessageToast"
], function(MessageToast) {
    'use strict';

    return {
        <%- (typeof eventHandlerFnName !== 'undefined' && eventHandlerFnName) || 'onPress' %>: function() {
            MessageToast.show("Custom handler invoked.");
        }
    };
});
