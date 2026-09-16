sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"testnamespace/feopv4cap/test/integration/pages/BooksObjectPage.gen"
], function (JourneyRunner, BooksObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('testnamespace/feopv4cap') + '/test/flpSandbox.html#testnamespacefeopv4cap-tile',
        pages: {
			onTheBooksObjectPageGenerated: BooksObjectPageGenerated
        },
        async: true
    });

    return runner;
});

