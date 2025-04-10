/*global QUnit*/

sap.ui.define([
	"sap/ui/test/opaQunit",
	"sap/ui/Device",
	"./pages/Worklist",
	"./pages/Browser",
	"./pages/Object"
], function (opaTest, Device) {
	"use strict";

	QUnit.module("Navigation");

	opaTest("Should see the objects list", function (Given, When, Then) {
		// Arrangements
		Given.iStartMyApp();

		// Assertions
		Then.onTheWorklistPage.iShouldSeeTheTable();
	});

	opaTest("Object Page shows the correct object Details", function (Given, When, Then) {
		// Actions
		When.onTheWorklistPage.iRememberTheItemAtPosition(1).
			and.iPressATableItemAtPosition(1);

		// Assertions
		Then.onTheObjectPage.iShouldSeeTheRememberedObject();
	});

	opaTest("Should be on the table page again when browser back is pressed", function (Given, When, Then) {
		// Actions
		When.onTheBrowser.iPressOnTheBackwardsButton();

		// Assertions
		Then.onTheWorklistPage.iShouldSeeTheTable();

		// Cleanup
		Then.iTeardownMyApp();
	});

});