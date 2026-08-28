sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"testnamespace/worklistv4/test/integration/pages/TravelList.gen",
	"testnamespace/worklistv4/test/integration/pages/TravelObjectPage.gen",
	"testnamespace/worklistv4/test/integration/pages/BookingObjectPage.gen"
], function (JourneyRunner, TravelListGenerated, TravelObjectPageGenerated, BookingObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('testnamespace/worklistv4') + '/test/flpSandbox.html#testnamespaceworklistv4-tile',
        pages: {
			onTheTravelListGenerated: TravelListGenerated,
			onTheTravelObjectPageGenerated: TravelObjectPageGenerated,
			onTheBookingObjectPageGenerated: BookingObjectPageGenerated
        },
        async: true
    });

    return runner;
});

