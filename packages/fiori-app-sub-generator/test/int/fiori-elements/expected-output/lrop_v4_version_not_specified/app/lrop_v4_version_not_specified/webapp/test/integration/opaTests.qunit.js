sap.ui.require(
    [
        'sap/fe/test/JourneyRunner',
        'testNameSpace/lropv4versionnotspecified/test/integration/FirstJourney',
		'testNameSpace/lropv4versionnotspecified/test/integration/pages/BooksList',
		'testNameSpace/lropv4versionnotspecified/test/integration/pages/BooksObjectPage'
    ],
    function(JourneyRunner, opaJourney, BooksList, BooksObjectPage) {
        'use strict';
        var JourneyRunner = new JourneyRunner({
            // start index.html in web folder
            launchUrl: sap.ui.require.toUrl('testNameSpace/lropv4versionnotspecified') + '/index.html'
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