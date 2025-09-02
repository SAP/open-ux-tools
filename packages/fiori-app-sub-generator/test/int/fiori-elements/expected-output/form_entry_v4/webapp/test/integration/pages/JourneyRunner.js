sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"testNameSpace/formentryv4/test/integration/pages/TravelObjectPage",
	"testNameSpace/formentryv4/test/integration/pages/BookingObjectPage"
], function (JourneyRunner, TravelObjectPage, BookingObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('testNameSpace/formentryv4') + '/test/flpSandbox.html?sap-ui-xx-viewCache=false#testNameSpaceformentryv4-tile',
        pages: {
			onTheTravelObjectPage: TravelObjectPage,
			onTheBookingObjectPage: BookingObjectPage
        },
        async: true
    });

    return runner;
});

