import opaTest from "sap/ui/test/opaQunit";
import {
	BookedFlightsMain,
	JourneyRunner
} from "./pages/JourneyRunner";

QUnit.module("First journey");

opaTest("Start application", function () {
	BookedFlightsMain.iStartMyApp();
	BookedFlightsMain.iSeeThisPage();
});

opaTest("Teardown", function () {
	// Cleanup
	BookedFlightsMain.iTearDownMyApp();
});

JourneyRunner.run();
