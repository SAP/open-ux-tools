sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"testNameSpace/worklistv4/test/integration/pages/TravelList.gen",
	"testNameSpace/worklistv4/test/integration/pages/TravelObjectPage.gen",
	"testNameSpace/worklistv4/test/integration/pages/BookingObjectPage.gen"
], function (JourneyRunner, TravelListGenerated, TravelObjectPageGenerated, BookingObjectPageGenerated) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('testNameSpace/worklistv4') + '/test/flpSandbox.html#testNameSpaceworklistv4-tile',
        pages: {
			onTheTravelListGenerated: TravelListGenerated,
			onTheTravelObjectPageGenerated: TravelObjectPageGenerated,
			onTheBookingObjectPageGenerated: BookingObjectPageGenerated
        },
        async: true
    });

    return runner;
});

