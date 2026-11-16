sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iResetMockData({ ServiceUri: "/sap/opu/odata4/dmo/sb_travel_mduu_o4/srvd/dmo/sd_travel_mduu/0001/" });
            Given.iResetTestData();
            Given.iStartMyApp();
            Then.onTheTravelListGenerated.iSeeThisPage();
        });


        opaTest("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            
            Then.onTheTravelListGenerated.onTable().iCheckRows();

            When.onTheTravelListGenerated.onTable().iPressRow(0);
            Then.onTheTravelObjectPageGenerated.iSeeThisPage();

        });

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});