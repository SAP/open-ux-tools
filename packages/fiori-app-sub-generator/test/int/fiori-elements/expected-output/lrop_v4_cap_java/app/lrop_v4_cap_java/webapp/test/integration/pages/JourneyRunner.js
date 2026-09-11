sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"testnamespace/lropv4capjava/test/integration/pages/BooksObjectPage.gen"
], function (JourneyRunner, BooksObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('testnamespace/lropv4capjava') + '/test/flpSandbox.html#testnamespacelropv4capjava-tile',
        pages: {
			onTheBooksObjectPageGenerated: BooksObjectPageGenerated
        },
        async: true
    });

    return runner;
});

