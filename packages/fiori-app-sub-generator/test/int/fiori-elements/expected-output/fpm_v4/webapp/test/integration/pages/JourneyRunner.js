sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"testNameSpace/fpmv4/test/integration/pages/TravelMain"
], function (JourneyRunner, TravelMain) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('testNameSpace/fpmv4') + '/index.html',
        pages: {
			onTheTravelMain: TravelMain
        },
        async: true
    });

    return runner;
});

