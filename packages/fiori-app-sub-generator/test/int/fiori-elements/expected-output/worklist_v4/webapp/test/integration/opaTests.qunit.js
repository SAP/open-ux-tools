sap.ui.require(
    [
        'sap/fe/test/JourneyRunner',
        'testNameSpace/worklistv4/test/integration/FirstJourney',
		'testNameSpace/worklistv4/test/integration/pages/TravelList',
		'testNameSpace/worklistv4/test/integration/pages/TravelObjectPage',
		'testNameSpace/worklistv4/test/integration/pages/BookingObjectPage'
    ],
    function(JourneyRunner, opaJourney, TravelList, TravelObjectPage, BookingObjectPage) {
        'use strict';
        var JourneyRunner = new JourneyRunner({
            // start index.html in web folder
            launchUrl: sap.ui.require.toUrl('testNameSpace/worklistv4') + '/index.html'
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