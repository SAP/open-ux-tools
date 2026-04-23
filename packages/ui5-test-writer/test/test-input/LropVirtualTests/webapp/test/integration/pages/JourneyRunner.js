sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"project3/test/integration/pages/TravelList",
	"project3/test/integration/pages/TravelObjectPage"
], function (JourneyRunner, TravelList, TravelObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('project3') + '/test/flp.html#app-preview',
        pages: {
			onTheTravelList: TravelList,
			onTheTravelObjectPage: TravelObjectPage
        },
        async: true
    });

    return runner;
});

