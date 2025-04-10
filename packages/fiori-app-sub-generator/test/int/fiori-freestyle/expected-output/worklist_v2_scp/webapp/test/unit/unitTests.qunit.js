/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"testAppNamespace/worklistv2scp/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});