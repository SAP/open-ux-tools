sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"testNameSpace/fpmv4/test/integration/pages/TravelMain.gen"
], function (JourneyRunner, TravelMainGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('testNameSpace/fpmv4') + '/test/flpSandbox.html#testNameSpacefpmv4-tile',
        pages: {
			onTheTravelMainGenerated: TravelMainGenerated
        },
        async: true
    });

    return runner;
});

