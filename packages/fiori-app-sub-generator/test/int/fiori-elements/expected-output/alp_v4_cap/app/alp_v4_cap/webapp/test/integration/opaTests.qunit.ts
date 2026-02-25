/* global QUnit */
QUnit.config.autostart = false;

sap.ui.require(["testNameSpace/alpv4cap/test/integration/FirstJourney"], () => {
	QUnit.start();
});
