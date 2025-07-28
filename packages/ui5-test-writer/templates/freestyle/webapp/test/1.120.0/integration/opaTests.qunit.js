/* global QUnit */
QUnit.config.autostart = false;

sap.ui.require(["<%= appIdWithSlash %>/test/integration/AllJourneys"
], function () {
	QUnit.start();
});
