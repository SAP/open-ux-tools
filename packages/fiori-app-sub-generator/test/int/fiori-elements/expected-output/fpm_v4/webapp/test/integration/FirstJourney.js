sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (test, JourneyRunner) {
    "use strict";

    function run() {
        QUnit.module("First journey");

        test("Start application", function (Given, When, Then) {
            Given.iStartMyApp();

            Then.onTheTravelMain.iSeeThisPage();

        });


        test("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    JourneyRunner.run({}, run)
});