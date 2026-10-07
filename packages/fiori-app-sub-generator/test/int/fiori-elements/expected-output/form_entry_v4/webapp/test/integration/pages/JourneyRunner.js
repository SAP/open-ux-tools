sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"testnamespace/formentryv4/test/integration/pages/TravelObjectPage.gen",
	"testnamespace/formentryv4/test/integration/pages/BookingObjectPage.gen"
], function (JourneyRunner, TravelObjectPageGenerated, BookingObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('testnamespace/formentryv4') + '/test/flpSandbox.html#testnamespaceformentryv4-tile',
        pages: {
			onTheTravelObjectPageGenerated: TravelObjectPageGenerated,
			onTheBookingObjectPageGenerated: BookingObjectPageGenerated
        },
        async: true
    });

    return runner;
});

