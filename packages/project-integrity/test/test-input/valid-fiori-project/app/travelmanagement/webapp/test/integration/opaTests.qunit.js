sap.ui.require(
    [
        'sap/fe/test/JourneyRunner',
        'travelmanagement/test/integration/FirstJourney',
		'travelmanagement/test/integration/pages/TravelList',
		'travelmanagement/test/integration/pages/TravelObjectPage'
    ],
    function(JourneyRunner, opaJourney, TravelList, TravelObjectPage) {
        'use strict';
        var JourneyRunner = new JourneyRunner({
            // start index.html in web folder
            launchUrl: sap.ui.require.toUrl('travelmanagement') + '/index.html'
        });

       
        JourneyRunner.run(
            {
                pages: { 
					onTheTravelList: TravelList,
					onTheTravelObjectPage: TravelObjectPage
                }
            },
            opaJourney.run
        );
    }
);