/* global QUnit */
// https://api.qunitjs.com/config/autostart/
QUnit.config.autostart = false;

// import all your OPA journeys here
void Promise.all([
	import("sap/fe/demo/customPageAppTs/test/integration/FirstJourney")
]).then(() => {
	QUnit.start();
});
