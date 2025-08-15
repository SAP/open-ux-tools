sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"testNameSpace/alpv4/test/integration/pages/SalesOrderItemList",
	"testNameSpace/alpv4/test/integration/pages/SalesOrderItemObjectPage",
	"testNameSpace/alpv4/test/integration/pages/MaterialDetailsObjectPage"
], function (JourneyRunner, SalesOrderItemList, SalesOrderItemObjectPage, MaterialDetailsObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('testNameSpace/alpv4') + '/index.html',
        pages: {
			onTheSalesOrderItemList: SalesOrderItemList,
			onTheSalesOrderItemObjectPage: SalesOrderItemObjectPage,
			onTheMaterialDetailsObjectPage: MaterialDetailsObjectPage
        },
        async: true
    });

    return runner;
});

