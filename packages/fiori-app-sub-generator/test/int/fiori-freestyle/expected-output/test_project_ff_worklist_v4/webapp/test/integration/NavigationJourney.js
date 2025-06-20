sap.ui.define([
	"sap/ui/test/opaQunit",
	"./pages/App"
], function (opaTest) {
	"use strict";

	QUnit.module("Navigation");

	opaTest("Should see the app view", function (Given, When, Then) {
		// Arrangements
		Given.iStartMyApp();

		// Assertion
		Then.onTheAppPage.iShouldSeeTheApp();

		// Cleanup
		Then.iTeardownMyApp();
	});
});
