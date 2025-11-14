sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'com.company.managetravels.managetravels',
            componentId: 'TravelsList',
            contextPath: '/Travels'
        },
        CustomPageDefinitions
    );
});