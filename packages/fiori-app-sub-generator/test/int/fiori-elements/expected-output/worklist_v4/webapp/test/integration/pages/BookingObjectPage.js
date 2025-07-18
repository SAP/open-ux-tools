sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'testNameSpace.worklistv4',
            componentId: 'BookingObjectPage',
            contextPath: '/Travel/_Booking'
        },
        CustomPageDefinitions
    );
});