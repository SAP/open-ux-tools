sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"testnamespace/lropv4cap/test/integration/pages/BooksList.gen",
	"testnamespace/lropv4cap/test/integration/pages/BooksObjectPage.gen"
], function (JourneyRunner, BooksListGenerated, BooksObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('testnamespace/lropv4cap') + '/test/flp.html#app-preview',
        pages: {
			onTheBooksListGenerated: BooksListGenerated,
			onTheBooksObjectPageGenerated: BooksObjectPageGenerated
        },
        async: true
    });

    return runner;
});

