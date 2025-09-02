sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"testNameSpace/lropv4cap/test/integration/pages/BooksList",
	"testNameSpace/lropv4cap/test/integration/pages/BooksObjectPage"
], function (JourneyRunner, BooksList, BooksObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('testNameSpace/lropv4cap') + '/test/flpSandbox.html#testNameSpacelropv4cap-tile',
        pages: {
			onTheBooksList: BooksList,
			onTheBooksObjectPage: BooksObjectPage
        },
        async: true
    });

    return runner;
});

