/* global QUnit */
QUnit.config.autostart = false;

sap.ui.require([
    "<%= appIdWithSlash %>/test/unit/AllTests"
], function () {
    "use strict";

    QUnit.start();
});