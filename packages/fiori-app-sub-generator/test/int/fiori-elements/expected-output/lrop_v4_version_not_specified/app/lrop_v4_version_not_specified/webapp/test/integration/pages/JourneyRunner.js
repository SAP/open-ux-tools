sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"testnamespace/lropv4versionnotspecified/test/integration/pages/BooksList.gen",
	"testnamespace/lropv4versionnotspecified/test/integration/pages/BooksObjectPage.gen"
], function (JourneyRunner, BooksListGenerated, BooksObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('testnamespace/lropv4versionnotspecified') + '/test/flpSandbox.html#testnamespacelropv4versionnots-tile',
        pages: {
			onTheBooksListGenerated: BooksListGenerated,
			onTheBooksObjectPageGenerated: BooksObjectPageGenerated
        },
        async: true
    });

    return runner;
});

