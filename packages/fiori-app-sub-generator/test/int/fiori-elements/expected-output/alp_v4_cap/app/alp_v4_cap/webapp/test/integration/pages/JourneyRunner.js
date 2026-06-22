sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"testNameSpace/alpv4cap/test/integration/pages/BooksList.gen",
	"testNameSpace/alpv4cap/test/integration/pages/BooksObjectPage.gen"
], function (JourneyRunner, BooksListGenerated, BooksObjectPageGenerated) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('testNameSpace/alpv4cap') + '/test/flpSandbox.html#testNameSpacealpv4cap-tile',
        pages: {
			onTheBooksListGenerated: BooksListGenerated,
			onTheBooksObjectPageGenerated: BooksObjectPageGenerated
        },
        async: true
    });

    return runner;
});

