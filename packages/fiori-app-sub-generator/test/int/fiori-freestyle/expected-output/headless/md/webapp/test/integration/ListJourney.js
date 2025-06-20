/*global QUnit*/

sap.ui.define([
	"sap/ui/test/opaQunit",
	"./pages/List"
], function (opaTest) {
	"use strict";

	QUnit.module("List Detail");

	opaTest("Should see the list with all entries", function (Given, When, Then) {
		// Arrangements
		Given.iStartMyApp();

		// Assertions
		Then.onTheMasterPage.iShouldSeeTheList();
	});

	opaTest("Search for the First object should deliver results that contain the firstObject in the name", function (Given, When, Then) {
		//Actions
		When.onTheMasterPage.iSearchForTheFirstObject();

		// Assertions
		Then.onTheMasterPage.theListShowsOnlyObjectsWithTheSearchStringInTheirTitle();
	});

});