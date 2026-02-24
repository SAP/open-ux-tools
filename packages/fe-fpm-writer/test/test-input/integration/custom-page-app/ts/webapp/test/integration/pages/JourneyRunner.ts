import TestRunner from "sap/fe/test/JourneyRunner";
import BookedFlightsMainPage from "./BookedFlightsMain";

export const BookedFlightsMain = BookedFlightsMainPage.onThePage;
export const JourneyRunner = new TestRunner({
	launchUrl: "sap/bc/ui5_ui5/ui2/ushell/shells/abap/Fiorilaunchpad.html?sap-ui-xx-viewCache=false&sap-client=100#customPageAppTs-tile",
	launchParameters: {},
	opaConfig: {
		timeout: 15
	},
	pages: {
		 onThePage: BookedFlightsMainPage.onThePage
	}
});
