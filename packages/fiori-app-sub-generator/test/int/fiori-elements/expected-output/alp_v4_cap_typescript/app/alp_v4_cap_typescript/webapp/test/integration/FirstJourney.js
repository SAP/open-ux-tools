sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (test, JourneyRunner) {
    "use strict";

    function run() {
        QUnit.module("First journey");

        test("Start application", function (Given, When, Then) {
            Given.iStartMyApp();

            Then.onTheBooksList.iSeeThisPage();

        });


        test("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            
            When.onTheBooksList.onFilterBar().iExecuteSearch();
            
            Then.onTheBooksList.onTable().iCheckRows();

            When.onTheBooksList.onTable().iPressRow(0);
            Then.onTheBooksObjectPage.iSeeThisPage();

        });

        test("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    JourneyRunner.run({}, run)
});