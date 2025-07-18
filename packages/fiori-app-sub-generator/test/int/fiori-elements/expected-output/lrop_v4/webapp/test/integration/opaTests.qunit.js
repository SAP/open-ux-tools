sap.ui.require(
    [
        'sap/fe/test/JourneyRunner',
        'testNameSpace/lropv4/test/integration/FirstJourney',
		'testNameSpace/lropv4/test/integration/pages/TravelList',
		'testNameSpace/lropv4/test/integration/pages/TravelObjectPage',
		'testNameSpace/lropv4/test/integration/pages/BookingObjectPage'
    ],
    function(JourneyRunner, opaJourney, TravelList, TravelObjectPage, BookingObjectPage) {
        'use strict';
        var JourneyRunner = new JourneyRunner({
            // start index.html in web folder
            launchUrl: sap.ui.require.toUrl('testNameSpace/lropv4') + '/index.html'
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