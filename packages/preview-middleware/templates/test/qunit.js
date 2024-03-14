sap.ui.define([
    'sap/ui/thirdparty/qunit-2'
], function() {
        sap.ui.require(<%- JSON.stringify(tests) %>);
    }
);