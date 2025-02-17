<% if (ui5Version === "1.71.0") { -%>
/* global QUnit */
// https://api.qunitjs.com/config/autostart/
<% } else { -%>
/* @sapUiRequire */
<% } -%>
QUnit.config.autostart = false;

// import all your QUnit tests here
void Promise.all([
	<% if (ui5Version !== "1.71.0") { -%>import("sap/ui/core/Core"), // Required to wait until Core has booted to start the QUnit tests <% }-%>
import("unit/controller/<%= viewName %>Page.controller")
]).then((<% if (ui5Version !== "1.71.0") { -%>[{ default: Core }]<% } %>) => {
	QUnit.start();
});