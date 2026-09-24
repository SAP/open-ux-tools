sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iResetMockData({ ServiceUri: "/sap/opu/odata4/sap/c_salesordermanage_srv/srvd/sap/c_salesordermanage_sd_aggregate/0001/" });
            Given.iResetTestData();
            Given.iStartMyApp();
            
        });


        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});