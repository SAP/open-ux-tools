/* global QUnit */
QUnit.config.autostart = false;

sap.ui.require(["testNameSpace/fpmv4/test/integration/FirstJourney"], () => {
	QUnit.start();
});
