sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"testNameSpace/lropv4cap/test/integration/pages/BooksList.gen",
	"testNameSpace/lropv4cap/test/integration/pages/BooksObjectPage.gen"
], function (JourneyRunner, BooksListGenerated, BooksObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('testNameSpace/lropv4cap') + '/test/flp.html#app-preview',
        pages: {
			onTheBooksListGenerated: BooksListGenerated,
			onTheBooksObjectPageGenerated: BooksObjectPageGenerated
        },
        async: true
    });

    return runner;
});

