sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"testnamespace/alpv4ui511204/test/integration/pages/SalesOrderItemList.gen",
	"testnamespace/alpv4ui511204/test/integration/pages/SalesOrderItemObjectPage.gen",
	"testnamespace/alpv4ui511204/test/integration/pages/MaterialDetailsObjectPage.gen"
], function (JourneyRunner, SalesOrderItemListGenerated, SalesOrderItemObjectPageGenerated, MaterialDetailsObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('testnamespace/alpv4ui511204') + '/test/flpSandbox.html#testnamespacealpv4ui511204-tile',
        pages: {
			onTheSalesOrderItemListGenerated: SalesOrderItemListGenerated,
			onTheSalesOrderItemObjectPageGenerated: SalesOrderItemObjectPageGenerated,
			onTheMaterialDetailsObjectPageGenerated: MaterialDetailsObjectPageGenerated
        },
        async: true
    });

    return runner;
});

