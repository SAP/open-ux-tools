/* global QUnit */
QUnit.config.autostart = false;

sap.ui.require(["<%- appPath %>/test/integration/<%- opaJourneyFileName %>"], () => {
	QUnit.start();
});
