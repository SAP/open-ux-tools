/* global QUnit */
// https://api.qunitjs.com/config/autostart/
QUnit.config.autostart = false;

// import all your OPA journeys here
void Promise.all([
	import("<%= id %>/test/integration/FirstJourney")
]).then(() => {
	QUnit.start();
});
