sap.ui.define([
    'sap/ui/thirdparty/qunit-2'
], function(QUnit) {
        QUnit.config.autostart = false;
        sap.ui.require(<%- JSON.stringify(tests) %>, function() {
            QUnit.start();
    });
});