sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"testnamespace/lropv4/test/integration/pages/TravelList.gen",
	"testnamespace/lropv4/test/integration/pages/TravelObjectPage.gen",
	"testnamespace/lropv4/test/integration/pages/BookingObjectPage.gen"
], function (JourneyRunner, TravelListGenerated, TravelObjectPageGenerated, BookingObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('testnamespace/lropv4') + '/test/flp.html#app-preview',
        pages: {
			onTheTravelListGenerated: TravelListGenerated,
			onTheTravelObjectPageGenerated: TravelObjectPageGenerated,
			onTheBookingObjectPageGenerated: BookingObjectPageGenerated
        },
        async: true
    });

    return runner;
});

