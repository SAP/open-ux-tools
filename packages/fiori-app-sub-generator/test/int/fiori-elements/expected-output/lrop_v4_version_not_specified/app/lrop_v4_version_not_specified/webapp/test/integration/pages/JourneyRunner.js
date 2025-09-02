sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"testNameSpace/lropv4versionnotspecified/test/integration/pages/BooksList",
	"testNameSpace/lropv4versionnotspecified/test/integration/pages/BooksObjectPage"
], function (JourneyRunner, BooksList, BooksObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('testNameSpace/lropv4versionnotspecified') + '/test/flpSandbox.html?sap-ui-xx-viewCache=false#testNameSpacelropv4versionnots-tile',
        pages: {
			onTheBooksList: BooksList,
			onTheBooksObjectPage: BooksObjectPage
        },
        async: true
    });

    return runner;
});

