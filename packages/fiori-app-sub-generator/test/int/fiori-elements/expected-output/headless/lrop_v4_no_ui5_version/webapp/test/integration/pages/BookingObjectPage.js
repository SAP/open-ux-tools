sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'testnamepsace.lropv4noui5version',
            componentId: 'BookingObjectPage',
            contextPath: '/Travel/_Booking'
        },
        CustomPageDefinitions
    );
});