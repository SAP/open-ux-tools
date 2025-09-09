sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"testNameSpace/worklistv4/test/integration/pages/TravelList",
	"testNameSpace/worklistv4/test/integration/pages/TravelObjectPage",
	"testNameSpace/worklistv4/test/integration/pages/BookingObjectPage"
], function (JourneyRunner, TravelList, TravelObjectPage, BookingObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('testNameSpace/worklistv4') + '/test/flpSandbox.html#testNameSpaceworklistv4-tile',
        pages: {
			onTheTravelList: TravelList,
			onTheTravelObjectPage: TravelObjectPage,
			onTheBookingObjectPage: BookingObjectPage
        },
        async: true
    });

    return runner;
});

