sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (test, JourneyRunner) {
    "use strict";

    function run() {
        QUnit.module("First journey");

        test("Start application", function (Given, When, Then) {
            Given.iStartMyApp();

            Then.onTheTravelList.iSeeThisPage();

        });


        test("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            
            Then.onTheTravelList.onTable().iCheckRows();

            When.onTheTravelList.onTable().iPressRow(0);
            Then.onTheTravelObjectPage.iSeeThisPage();

        });

        test("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    JourneyRunner.run({}, run)
});