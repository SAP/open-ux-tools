sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/company/managetravels/managetravels/test/integration/pages/TravelsList",
	"com/company/managetravels/managetravels/test/integration/pages/TravelsObjectPage"
], function (JourneyRunner, TravelsList, TravelsObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/company/managetravels/managetravels') + '/test/flpSandbox.html#comcompanymanagetravelsmanaget-tile',
        pages: {
			onTheTravelsList: TravelsList,
			onTheTravelsObjectPage: TravelsObjectPage
        },
        async: true
    });

    return runner;
});

