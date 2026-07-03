sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"testnamepsace/lropv4noui5version/test/integration/pages/TravelList.gen",
	"testnamepsace/lropv4noui5version/test/integration/pages/TravelObjectPage.gen",
	"testnamepsace/lropv4noui5version/test/integration/pages/BookingObjectPage.gen"
], function (JourneyRunner, TravelListGenerated, TravelObjectPageGenerated, BookingObjectPageGenerated) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('testnamepsace/lropv4noui5version') + '/test/flp.html#app-preview',
        pages: {
			onTheTravelListGenerated: TravelListGenerated,
			onTheTravelObjectPageGenerated: TravelObjectPageGenerated,
			onTheBookingObjectPageGenerated: BookingObjectPageGenerated
        },
        async: true
    });

    return runner;
});

