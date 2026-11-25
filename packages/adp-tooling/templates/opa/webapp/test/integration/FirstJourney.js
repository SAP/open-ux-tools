sap.ui.define([
    "sap/ui/test/opaQunit",
    "sap/ui/test/Opa5"
], function (opaTest, Opa5) {
    "use strict";

    var Journey = {
        run: function () {
            QUnit.module("First journey");

            opaTest("Setup", function (Given, When, Then) {
                Given.iStartMyApp();
            });


            opaTest("My first test", function (Given, When, Then) {
                // Write your first test here
                Opa5.assert.ok(true, "First test assertion passed");
            });

            opaTest("Teardown", function (Given, When, Then) {
                // Cleanup
                Given.iTearDownMyApp();
            });
        }
    }

    return Journey;
});
