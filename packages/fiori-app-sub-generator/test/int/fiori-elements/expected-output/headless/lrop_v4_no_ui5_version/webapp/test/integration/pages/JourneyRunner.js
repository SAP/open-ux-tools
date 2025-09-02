sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"testnamepsace/lropv4noui5version/test/integration/pages/TravelList",
	"testnamepsace/lropv4noui5version/test/integration/pages/TravelObjectPage",
	"testnamepsace/lropv4noui5version/test/integration/pages/BookingObjectPage"
], function (JourneyRunner, TravelList, TravelObjectPage, BookingObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('testnamepsace/lropv4noui5version') + '/test/flpSandbox.html?sap-ui-xx-viewCache=false#testnamepsacelropv4noui5versio-tile',
        pages: {
			onTheTravelList: TravelList,
			onTheTravelObjectPage: TravelObjectPage,
			onTheBookingObjectPage: BookingObjectPage
        },
        async: true
    });

    return runner;
});

