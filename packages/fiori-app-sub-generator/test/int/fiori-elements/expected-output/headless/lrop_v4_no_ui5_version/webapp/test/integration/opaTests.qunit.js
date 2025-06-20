sap.ui.require(
    [
        'sap/fe/test/JourneyRunner',
        'testnamepsace/lropv4noui5version/test/integration/FirstJourney',
		'testnamepsace/lropv4noui5version/test/integration/pages/TravelList',
		'testnamepsace/lropv4noui5version/test/integration/pages/TravelObjectPage',
		'testnamepsace/lropv4noui5version/test/integration/pages/BookingObjectPage'
    ],
    function(JourneyRunner, opaJourney, TravelList, TravelObjectPage, BookingObjectPage) {
        'use strict';
        var JourneyRunner = new JourneyRunner({
            // start index.html in web folder
            launchUrl: sap.ui.require.toUrl('testnamepsace/lropv4noui5version') + '/index.html'
        });

       
        JourneyRunner.run(
            {
                pages: { 
					onTheTravelList: TravelList,
					onTheTravelObjectPage: TravelObjectPage,
					onTheBookingObjectPage: BookingObjectPage
                }
            },
            opaJourney.run
        );
    }
);