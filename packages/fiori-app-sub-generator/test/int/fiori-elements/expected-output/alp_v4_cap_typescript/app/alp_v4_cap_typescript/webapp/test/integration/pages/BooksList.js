sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'testNameSpace.alpv4captypescript',
            componentId: 'BooksList',
            entitySet: 'Books'
        },
        CustomPageDefinitions
    );
});