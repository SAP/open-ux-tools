sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iResetMockData({ ServiceUri: "/admin/" });
            Given.iResetTestData();
            Given.iStartMyApp();
            Then.onTheBooksListGenerated.iSeeThisPage();
        });


        opaTest("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            
            When.onTheBooksListGenerated.onFilterBar().iExecuteSearch();
            
            Then.onTheBooksListGenerated.onTable().iCheckRows();

            When.onTheBooksListGenerated.onTable().iPressRow(0);
            Then.onTheBooksObjectPageGenerated.iSeeThisPage();

        });

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});