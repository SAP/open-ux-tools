sap.ui.require(
    [
        'sap/fe/test/JourneyRunner',
        'testNameSpace/alpv4/test/integration/FirstJourney',
		'testNameSpace/alpv4/test/integration/pages/SalesOrderItemList',
		'testNameSpace/alpv4/test/integration/pages/SalesOrderItemObjectPage',
		'testNameSpace/alpv4/test/integration/pages/MaterialDetailsObjectPage'
    ],
    function(JourneyRunner, opaJourney, SalesOrderItemList, SalesOrderItemObjectPage, MaterialDetailsObjectPage) {
        'use strict';
        var JourneyRunner = new JourneyRunner({
            // start index.html in web folder
            launchUrl: sap.ui.require.toUrl('testNameSpace/alpv4') + '/index.html'
        });

       
        JourneyRunner.run(
            {
                pages: { 
					onTheSalesOrderItemList: SalesOrderItemList,
					onTheSalesOrderItemObjectPage: SalesOrderItemObjectPage,
					onTheMaterialDetailsObjectPage: MaterialDetailsObjectPage
                }
            },
            opaJourney.run
        );
    }
);