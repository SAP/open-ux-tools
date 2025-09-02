sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"testNameSpace/fpmv4/test/integration/pages/TravelMain"
], function (JourneyRunner, TravelMain) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('testNameSpace/fpmv4') + '/test/flpSandbox.html#testNameSpacefpmv4-tile',
        pages: {
			onTheTravelMain: TravelMain
        },
        async: true
    });

    return runner;
});

