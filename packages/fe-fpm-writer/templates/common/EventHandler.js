sap.ui.define([
    "sap/m/MessageToast"
], function(MessageToast) {
    'use strict';

    return {
        onPress: function() {
            MessageToast.show("Custom handler invoked.");
        }
    };
});
