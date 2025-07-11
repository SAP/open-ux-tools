/* global QUnit */
QUnit.config.autostart = false;

sap.ui.require([
    "sap/ui/core/Core",
    "unit/AllTests" 
], function (Core) {
    "use strict";

    Core.ready().then(function () {
        QUnit.start();
    });
});