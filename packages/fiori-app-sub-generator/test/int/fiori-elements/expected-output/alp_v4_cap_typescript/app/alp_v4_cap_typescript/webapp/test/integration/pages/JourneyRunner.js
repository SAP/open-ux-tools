sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"testNameSpace/alpv4captypescript/test/integration/pages/BooksList",
	"testNameSpace/alpv4captypescript/test/integration/pages/BooksObjectPage"
], function (JourneyRunner, BooksList, BooksObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('testNameSpace/alpv4captypescript') + '/test/flp.html?sap-ui-xx-viewCache=false#app-preview',
        pages: {
			onTheBooksList: BooksList,
			onTheBooksObjectPage: BooksObjectPage
        },
        async: true
    });

    return runner;
});

