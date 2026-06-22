sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"testNameSpace/feopv4cap/test/integration/pages/BooksObjectPage.gen"
], function (JourneyRunner, BooksObjectPageGenerated) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('testNameSpace/feopv4cap') + '/test/flpSandbox.html#testNameSpacefeopv4cap-tile',
        pages: {
			onTheBooksObjectPageGenerated: BooksObjectPageGenerated
        },
        async: true
    });

    return runner;
});

