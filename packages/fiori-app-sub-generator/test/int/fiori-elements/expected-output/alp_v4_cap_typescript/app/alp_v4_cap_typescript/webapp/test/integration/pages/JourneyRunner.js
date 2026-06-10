sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"testNameSpace/alpv4captypescript/test/integration/pages/BooksList.gen",
	"testNameSpace/alpv4captypescript/test/integration/pages/BooksObjectPage.gen"
], function (JourneyRunner, BooksListGenerated, BooksObjectPageGenerated) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('testNameSpace/alpv4captypescript') + '/test/flp.html#app-preview',
        pages: {
			onTheBooksListGenerated: BooksListGenerated,
			onTheBooksObjectPageGenerated: BooksObjectPageGenerated
        },
        async: true
    });

    return runner;
});

