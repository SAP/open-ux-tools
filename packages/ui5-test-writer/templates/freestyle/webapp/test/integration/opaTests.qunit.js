/* global QUnit */

sap.ui.require(["<%= appIdWithSlash %>/test/integration/AllJourneys"
], function () {
	QUnit.config.autostart = false;
	QUnit.start();
});
