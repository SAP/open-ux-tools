sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"testnamespace/lropv4ui511204/test/integration/pages/TravelList.gen",
	"testnamespace/lropv4ui511204/test/integration/pages/TravelObjectPage.gen",
	"testnamespace/lropv4ui511204/test/integration/pages/BookingObjectPage.gen"
], function (JourneyRunner, TravelListGenerated, TravelObjectPageGenerated, BookingObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('testnamespace/lropv4ui511204') + '/test/flpSandbox.html#testnamespacelropv4ui511204-tile',
        pages: {
			onTheTravelListGenerated: TravelListGenerated,
			onTheTravelObjectPageGenerated: TravelObjectPageGenerated,
			onTheBookingObjectPageGenerated: BookingObjectPageGenerated
        },
        async: true
    });

    return runner;
});

