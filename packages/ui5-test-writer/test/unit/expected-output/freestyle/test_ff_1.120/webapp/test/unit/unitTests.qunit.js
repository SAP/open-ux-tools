/* global QUnit */
QUnit.config.autostart = false;

sap.ui.require([
    "unit/AllTests"
], function () {
    "use strict";

    QUnit.start();
});