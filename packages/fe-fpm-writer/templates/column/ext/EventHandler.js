sap.ui.define([
    "sap/m/MessageToast"
], function(MessageToast) {
    'use strict';

    return {
        onPress: function() {
            MessageToast.show("CustomColumn action handler invoked.");
        }
    };
});
