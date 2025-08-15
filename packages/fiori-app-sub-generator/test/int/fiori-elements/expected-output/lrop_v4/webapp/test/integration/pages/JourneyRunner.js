sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"testNameSpace/lropv4/test/integration/pages/TravelList",
	"testNameSpace/lropv4/test/integration/pages/TravelObjectPage",
	"testNameSpace/lropv4/test/integration/pages/BookingObjectPage"
], function (JourneyRunner, TravelList, TravelObjectPage, BookingObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('testNameSpace/lropv4') + '/index.html',
        pages: {
			onTheTravelList: TravelList,
			onTheTravelObjectPage: TravelObjectPage,
			onTheBookingObjectPage: BookingObjectPage
        },
        async: true
    });

    return runner;
});

