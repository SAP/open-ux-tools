/* global QUnit */
QUnit.config.autostart = false;

sap.ui.require(["testNameSpace/alpv4/test/integration/FirstJourney"], () => {
	QUnit.start();
});
