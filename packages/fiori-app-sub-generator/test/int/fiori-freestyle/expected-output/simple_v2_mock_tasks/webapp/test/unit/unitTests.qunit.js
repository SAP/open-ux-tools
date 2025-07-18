/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"simplev2mocktasks/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});
