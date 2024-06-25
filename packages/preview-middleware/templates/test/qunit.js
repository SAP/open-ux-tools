sap.ui.loader.config({
    shim: {
        "sap/ui/qunit/qunit-junit": {
            deps: ["sap/ui/thirdparty/qunit-2"]
        },
        "sap/ui/qunit/qunit-coverage": {
            deps: ["sap/ui/thirdparty/qunit-2"]
        },
        "sap/ui/thirdparty/sinon-qunit": {
            deps: ["sap/ui/thirdparty/qunit-2", "sap/ui/thirdparty/sinon"]
        },
        "sap/ui/qunit/sinon-qunit-bridge": {
            deps: ["sap/ui/thirdparty/qunit", "sap/ui/thirdparty/sinon-4"]
        }        
    }
});

sap.ui.require([
    "sap/ui/thirdparty/qunit-2",
    "sap/ui/qunit/qunit-junit",
    "sap/ui/qunit/qunit-coverage"
], function (QUnit) {
    'use strict';
    QUnit.config.autostart = false;
    sap.ui.require(<%- JSON.stringify(tests) %>, function() {
        QUnit.start();
    }); 
});