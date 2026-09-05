sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"testnamespace/alpv4/test/integration/pages/SalesOrderItemList.gen",
	"testnamespace/alpv4/test/integration/pages/SalesOrderItemObjectPage.gen",
	"testnamespace/alpv4/test/integration/pages/MaterialDetailsObjectPage.gen"
], function (JourneyRunner, SalesOrderItemListGenerated, SalesOrderItemObjectPageGenerated, MaterialDetailsObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('testnamespace/alpv4') + '/test/flpSandbox.html#testnamespacealpv4-tile',
        pages: {
			onTheSalesOrderItemListGenerated: SalesOrderItemListGenerated,
			onTheSalesOrderItemObjectPageGenerated: SalesOrderItemObjectPageGenerated,
			onTheMaterialDetailsObjectPageGenerated: MaterialDetailsObjectPageGenerated
        },
        async: true
    });

    return runner;
});

