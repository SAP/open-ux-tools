sap.ui.require(
    [
        'sap/fe/test/JourneyRunner',
        'testNameSpace/formentryv4/test/integration/FirstJourney',
		'testNameSpace/formentryv4/test/integration/pages/TravelObjectPage',
		'testNameSpace/formentryv4/test/integration/pages/BookingObjectPage'
    ],
    function(JourneyRunner, opaJourney, TravelObjectPage, BookingObjectPage) {
        'use strict';
        var JourneyRunner = new JourneyRunner({
            // start index.html in web folder
            launchUrl: sap.ui.require.toUrl('testNameSpace/formentryv4') + '/index.html'
        });

       
        JourneyRunner.run(
            {
                pages: { 
					onTheTravelObjectPage: TravelObjectPage,
					onTheBookingObjectPage: BookingObjectPage
                }
            },
            opaJourney.run
        );
    }
);