sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'testNameSpace.lropv4',
            componentId: 'TravelList',
            entitySet: 'Travel'
        },
        CustomPageDefinitions
    );
});