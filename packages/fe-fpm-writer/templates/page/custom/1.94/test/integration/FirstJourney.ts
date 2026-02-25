import opaTest from "sap/ui/test/opaQunit";
import journeyRunner from "./pages/JourneyRunner";

QUnit.module("First journey");

opaTest("Start application", function (Given, When, Then) {
	Given.iStartMyApp();
	Then.onThe<%= entity %>Main.iSeeThisPage();
});

opaTest("Teardown", function (Given, When, Then) {
	// Cleanup
	Given.iTearDownMyApp();
});

journeyRunner.run();
