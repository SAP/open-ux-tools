sap.ui.define(['sap/fe/test/<%- template %>'], function(<%- template %>) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new <%- template %>(
        {
            appId: '<%- appID %>',
            componentId: '<%- componentID %>',
            entitySet: '<%- entitySet %>'
        },
        CustomPageDefinitions
    );
});