sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'testNameSpace.alpv4',
            componentId: 'SalesOrderItemObjectPage',
            entitySet: 'SalesOrderItem'
        },
        CustomPageDefinitions
    );
});