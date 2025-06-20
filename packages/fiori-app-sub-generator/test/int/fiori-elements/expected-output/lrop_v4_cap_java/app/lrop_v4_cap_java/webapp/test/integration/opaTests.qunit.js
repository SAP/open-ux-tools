sap.ui.require(
    [
        'sap/fe/test/JourneyRunner',
        'testNameSpace/lropv4capjava/test/integration/FirstJourney',
		'testNameSpace/lropv4capjava/test/integration/pages/BooksObjectPage'
    ],
    function(JourneyRunner, opaJourney, BooksObjectPage) {
        'use strict';
        var JourneyRunner = new JourneyRunner({
            // start index.html in web folder
            launchUrl: sap.ui.require.toUrl('testNameSpace/lropv4capjava') + '/index.html'
        });

       
        JourneyRunner.run(
            {
                pages: { 
					onTheBooksObjectPage: BooksObjectPage
                }
            },
            opaJourney.run
        );
    }
);