sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"testNameSpace/lropv4versionnotspecified/test/integration/pages/BooksList.gen",
	"testNameSpace/lropv4versionnotspecified/test/integration/pages/BooksObjectPage.gen"
], function (JourneyRunner, BooksListGenerated, BooksObjectPageGenerated) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('testNameSpace/lropv4versionnotspecified') + '/test/flpSandbox.html#testNameSpacelropv4versionnots-tile',
        pages: {
			onTheBooksListGenerated: BooksListGenerated,
			onTheBooksObjectPageGenerated: BooksObjectPageGenerated
        },
        async: true
    });

    return runner;
});

