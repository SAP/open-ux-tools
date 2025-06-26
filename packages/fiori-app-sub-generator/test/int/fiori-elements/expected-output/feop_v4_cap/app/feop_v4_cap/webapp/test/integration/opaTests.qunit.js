sap.ui.require(
    [
        'sap/fe/test/JourneyRunner',
        'testNameSpace/feopv4cap/test/integration/FirstJourney',
		'testNameSpace/feopv4cap/test/integration/pages/BooksObjectPage'
    ],
    function(JourneyRunner, opaJourney, BooksObjectPage) {
        'use strict';
        var JourneyRunner = new JourneyRunner({
            // start index.html in web folder
            launchUrl: sap.ui.require.toUrl('testNameSpace/feopv4cap') + '/index.html'
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