sap.ui.require(
    [
        'sap/fe/test/JourneyRunner',
        'testNameSpace/lropv4cap/test/integration/FirstJourney',
		'testNameSpace/lropv4cap/test/integration/pages/BooksList',
		'testNameSpace/lropv4cap/test/integration/pages/BooksObjectPage'
    ],
    function(JourneyRunner, opaJourney, BooksList, BooksObjectPage) {
        'use strict';
        var JourneyRunner = new JourneyRunner({
            // start index.html in web folder
            launchUrl: sap.ui.require.toUrl('testNameSpace/lropv4cap') + '/index.html'
        });

       
        JourneyRunner.run(
            {
                pages: { 
					onTheBooksList: BooksList,
					onTheBooksObjectPage: BooksObjectPage
                }
            },
            opaJourney.run
        );
    }
);