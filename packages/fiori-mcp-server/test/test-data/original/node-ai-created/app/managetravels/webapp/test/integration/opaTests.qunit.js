sap.ui.require(
    [
        'sap/fe/test/JourneyRunner',
        'managetravels/test/integration/FirstJourney',
		'managetravels/test/integration/pages/TravelsList',
		'managetravels/test/integration/pages/TravelsObjectPage'
    ],
    function(JourneyRunner, opaJourney, TravelsList, TravelsObjectPage) {
        'use strict';
        var JourneyRunner = new JourneyRunner({
            // start index.html in web folder
            launchUrl: sap.ui.require.toUrl('managetravels') + '/index.html'
        });

       
        JourneyRunner.run(
            {
                pages: { 
					onTheTravelsList: TravelsList,
					onTheTravelsObjectPage: TravelsObjectPage
                }
            },
            opaJourney.run
        );
    }
);