import opaTest from "sap/ui/test/opaQunit";
import type { Given, When, Then } from "./types/OpaJourneyTypes.gen";
import runner from "./pages/JourneyRunner";

function journey() {
    QUnit.module("First journey");

    opaTest("Start application", function (Given: Given, _When: When, Then: Then) {
        Given.iStartMyApp();
        Then.onTheBooksListGenerated.iSeeThisPage();
    });


    opaTest("Navigate to ObjectPage", function (_Given: Given, When: When, Then: Then) {
        // Note: this test will fail if the ListReport page doesn't show any data
        
        When.onTheBooksListGenerated.onFilterBar().iExecuteSearch();
        
        Then.onTheBooksListGenerated.onTable("").iCheckRows();

        When.onTheBooksListGenerated.onTable("").iPressRow(0);
        Then.onTheBooksObjectPageGenerated.iSeeThisPage();

    });

    opaTest("Teardown", function (Given: Given) {
        // Cleanup
        Given.iTearDownMyApp();
    });
}

runner.run([journey]);
