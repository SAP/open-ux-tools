sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'testNameSpace.alpv4',
            componentId: 'SalesOrderItemList',
            entitySet: 'SalesOrderItem'
        },
        CustomPageDefinitions
    );
});