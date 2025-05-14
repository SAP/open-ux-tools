sap.ui.require(
    [
        'sap/fe/test/JourneyRunner',
        'testNameSpace/alpv4captypescript/test/integration/FirstJourney',
		'testNameSpace/alpv4captypescript/test/integration/pages/BooksList',
		'testNameSpace/alpv4captypescript/test/integration/pages/BooksObjectPage'
    ],
    function(JourneyRunner, opaJourney, BooksList, BooksObjectPage) {
        'use strict';
        var JourneyRunner = new JourneyRunner({
            // start index.html in web folder
            launchUrl: sap.ui.require.toUrl('testNameSpace/alpv4captypescript') + '/index.html'
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