import opaTest from "sap/ui/test/opaQunit";
import type { Given, When, Then } from "./types/OpaJourneyTypes";
import runner from "./pages/JourneyRunner";

function journey() {
    QUnit.module("First journey");

    opaTest("Start application", function (Given: Given, _When: When, _Then: Then) {
        Given.iStartMyApp();
        
    });


    opaTest("Teardown", function (Given: Given) {
        // Cleanup
        Given.iTearDownMyApp();
    });
}

runner.run([journey]);
