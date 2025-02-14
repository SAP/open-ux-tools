/* global QUnit */

sap.ui.require(["<%= formatNamespace(appId) %>/test/integration/AllJourneys"
], function () {
	QUnit.config.autostart = false;
	QUnit.start();
});
