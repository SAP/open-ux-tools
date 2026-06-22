sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"testNameSpace/lropv4/test/integration/pages/TravelList.gen",
	"testNameSpace/lropv4/test/integration/pages/TravelObjectPage.gen",
	"testNameSpace/lropv4/test/integration/pages/BookingObjectPage.gen"
], function (JourneyRunner, TravelListGenerated, TravelObjectPageGenerated, BookingObjectPageGenerated) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('testNameSpace/lropv4') + '/test/flp.html#app-preview',
        pages: {
			onTheTravelListGenerated: TravelListGenerated,
			onTheTravelObjectPageGenerated: TravelObjectPageGenerated,
			onTheBookingObjectPageGenerated: BookingObjectPageGenerated
        },
        async: true
    });

    return runner;
});

