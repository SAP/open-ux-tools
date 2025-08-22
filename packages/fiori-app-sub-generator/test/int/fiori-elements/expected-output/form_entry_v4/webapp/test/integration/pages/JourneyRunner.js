sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"testNameSpace/formentryv4/test/integration/pages/TravelObjectPage",
	"testNameSpace/formentryv4/test/integration/pages/BookingObjectPage"
], function (JourneyRunner, TravelObjectPage, BookingObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('testNameSpace/formentryv4') + '/index.html',
        pages: {
			onTheTravelObjectPage: TravelObjectPage,
			onTheBookingObjectPage: BookingObjectPage
        },
        async: true
    });

    return runner;
});

