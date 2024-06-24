window.QUnit ??= {};
QUnit.config ??= {};
QUnit.config.autostart = false;
QUnit.config.testTimeout = 180000;

sap.ui.require(['sap/ui/thirdparty/qunit-2'
], function() {
    'use strict';
    sap.ui.require(<%- JSON.stringify(tests) %>, function() {
        QUnit.start();
    }); 
});