/* global QUnit */
<% if (ui5Version === '1.71.0') { -%>
// https://api.qunitjs.com/config/autostart/
QUnit.config.autostart = false;

// import all your OPA journeys here
void Promise.all([
	import("integration/NavigationJourney")
]).then(() => {
	QUnit.start();
});
<% } else { -%>
sap.ui.require(["integration/NavigationJourney"
], function () {
	QUnit.config.autostart = false;
	QUnit.start();
});<% } %>