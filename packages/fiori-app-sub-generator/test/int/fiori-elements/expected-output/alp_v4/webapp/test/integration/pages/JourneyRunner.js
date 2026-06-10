sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"testNameSpace/alpv4/test/integration/pages/SalesOrderItemList.gen",
	"testNameSpace/alpv4/test/integration/pages/SalesOrderItemObjectPage.gen",
	"testNameSpace/alpv4/test/integration/pages/MaterialDetailsObjectPage.gen"
], function (JourneyRunner, SalesOrderItemListGenerated, SalesOrderItemObjectPageGenerated, MaterialDetailsObjectPageGenerated) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('testNameSpace/alpv4') + '/test/flpSandbox.html#testNameSpacealpv4-tile',
        pages: {
			onTheSalesOrderItemListGenerated: SalesOrderItemListGenerated,
			onTheSalesOrderItemObjectPageGenerated: SalesOrderItemObjectPageGenerated,
			onTheMaterialDetailsObjectPageGenerated: MaterialDetailsObjectPageGenerated
        },
        async: true
    });

    return runner;
});

