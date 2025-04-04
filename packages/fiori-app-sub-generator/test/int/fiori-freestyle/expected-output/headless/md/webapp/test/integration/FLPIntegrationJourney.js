/*global QUnit*/

sap.ui.define([
	"sap/ui/test/opaQunit",
	"./pages/List",
	"./pages/Detail"
], function (opaTest) {
	"use strict";

	QUnit.module("FLP Integration");

	opaTest("Should open the share menu and display the share buttons on the detail page", function (Given, When, Then) {
		// Arrangements
		Given.iStartMyFLPApp({intent : "appnamespacemd-display"});

		// Actions
		When.onTheMasterPage.iPressOnTheObjectAtPosition(1).
			and.iRememberTheSelectedItem();

		// Assertions
		Then.onTheDetailPage.iShouldSeeTheRememberedObject();

		// Actions
		When.onTheDetailPage.iPressOnTheShareButton();

		// Assertions
		Then.onTheDetailPage.iShouldSeeTheShareActionButtons().
			and.theShareTileButtonShouldContainTheRememberedObjectName();

		//Clean up
		Then.iLeaveMyFLPApp();
	});
});