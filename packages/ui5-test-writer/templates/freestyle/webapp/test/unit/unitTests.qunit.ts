<% if (ui5Version === "1.71.0") { -%>
/* global QUnit */
// https://api.qunitjs.com/config/autostart/
QUnit.config.autostart = false;

// import all your QUnit tests here
void Promise.all([
	import("unit/controller/<%= viewName %>Page.controller")
]).then(() => {
	QUnit.start();
});<% } else if (ui5Version === "1.120.0") { -%>
/* @sapUiRequire */
QUnit.config.autostart = false;

// import all your QUnit tests here
void Promise.all([
	import("sap/ui/core/Core"), // Required to wait until Core has booted to start the QUnit tests
	import("unit/controller/<%= viewName %>Page.controller")
]).then(([{ default: Core }]) => Core.ready()).then(() => {
	QUnit.start();
});<% } %>