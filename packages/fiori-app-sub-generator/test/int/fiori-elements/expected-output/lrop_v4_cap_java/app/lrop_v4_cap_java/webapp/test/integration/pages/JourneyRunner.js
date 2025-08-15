sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"testNameSpace/lropv4capjava/test/integration/pages/BooksObjectPage"
], function (JourneyRunner, BooksObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('testNameSpace/lropv4capjava') + '/index.html',
        pages: {
			onTheBooksObjectPage: BooksObjectPage
        },
        async: true
    });

    return runner;
});

