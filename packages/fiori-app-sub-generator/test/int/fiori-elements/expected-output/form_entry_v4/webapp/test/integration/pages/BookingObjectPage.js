sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'testNameSpace.formentryv4',
            componentId: 'BookingObjectPage',
            entitySet: 'Booking'
        },
        CustomPageDefinitions
    );
});