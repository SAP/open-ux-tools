import JourneyRunner from "sap/fe/test/JourneyRunner";
import <%= entity %>Main from "./<%= entity %>Main";

const journeyRunner = new JourneyRunner({
	launchUrl: sap.ui.require.toUrl("<%= id.replace(/\./g, '/') %>") + "/index.html",
	launchParameters: {},
	opaConfig: {
		timeout: 15
	},
	pages: {
		onThe<%= entity %>Main: <%= entity %>Main
	}
});

export default journeyRunner;
