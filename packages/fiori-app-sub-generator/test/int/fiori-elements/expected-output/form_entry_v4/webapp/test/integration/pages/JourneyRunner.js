sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"testNameSpace/formentryv4/test/integration/pages/TravelObjectPage.gen",
	"testNameSpace/formentryv4/test/integration/pages/BookingObjectPage.gen"
], function (JourneyRunner, TravelObjectPageGenerated, BookingObjectPageGenerated) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('testNameSpace/formentryv4') + '/test/flpSandbox.html#testNameSpaceformentryv4-tile',
        pages: {
			onTheTravelObjectPageGenerated: TravelObjectPageGenerated,
			onTheBookingObjectPageGenerated: BookingObjectPageGenerated
        },
        async: true
    });

    return runner;
});

