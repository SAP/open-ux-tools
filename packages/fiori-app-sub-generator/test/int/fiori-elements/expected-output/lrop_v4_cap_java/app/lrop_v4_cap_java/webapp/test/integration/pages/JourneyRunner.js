sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"testNameSpace/lropv4capjava/test/integration/pages/BooksObjectPage.gen"
], function (JourneyRunner, BooksObjectPageGenerated) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('testNameSpace/lropv4capjava') + '/test/flpSandbox.html#testNameSpacelropv4capjava-tile',
        pages: {
			onTheBooksObjectPageGenerated: BooksObjectPageGenerated
        },
        async: true
    });

    return runner;
});

