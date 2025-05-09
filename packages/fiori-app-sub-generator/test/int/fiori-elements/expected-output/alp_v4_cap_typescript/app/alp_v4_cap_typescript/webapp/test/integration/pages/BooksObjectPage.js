sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'testNameSpace.alpv4captypescript',
            componentId: 'BooksObjectPage',
            entitySet: 'Books'
        },
        CustomPageDefinitions
    );
});