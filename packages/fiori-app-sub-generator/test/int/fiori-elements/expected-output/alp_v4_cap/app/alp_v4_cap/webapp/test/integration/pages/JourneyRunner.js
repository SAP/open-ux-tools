sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"testNameSpace/alpv4cap/test/integration/pages/BooksList",
	"testNameSpace/alpv4cap/test/integration/pages/BooksObjectPage"
], function (JourneyRunner, BooksList, BooksObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('testNameSpace/alpv4cap') + '/test/flpSandbox.html#testNameSpacealpv4cap-tile',
        pages: {
			onTheBooksList: BooksList,
			onTheBooksObjectPage: BooksObjectPage
        },
        async: true
    });

    return runner;
});

