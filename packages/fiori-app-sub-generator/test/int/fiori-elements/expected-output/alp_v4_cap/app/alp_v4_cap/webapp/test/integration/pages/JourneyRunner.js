sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"testnamespace/alpv4cap/test/integration/pages/BooksList.gen",
	"testnamespace/alpv4cap/test/integration/pages/BooksObjectPage.gen"
], function (JourneyRunner, BooksListGenerated, BooksObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('testnamespace/alpv4cap') + '/test/flpSandbox.html#testnamespacealpv4cap-tile',
        pages: {
			onTheBooksListGenerated: BooksListGenerated,
			onTheBooksObjectPageGenerated: BooksObjectPageGenerated
        },
        async: true
    });

    return runner;
});

