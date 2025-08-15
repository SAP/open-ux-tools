sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"testNameSpace/feopv4cap/test/integration/pages/BooksObjectPage"
], function (JourneyRunner, BooksObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('testNameSpace/feopv4cap') + '/index.html',
        pages: {
			onTheBooksObjectPage: BooksObjectPage
        },
        async: true
    });

    return runner;
});

