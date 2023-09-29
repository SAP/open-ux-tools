sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: '<%- appID %>',
            componentId: '<%- componentID %>',<% if (locals.contextPath) { %>
            contextPath: '<%- contextPath %>'<% } else if (locals.entitySet) { %>
            entitySet: '<%- entitySet %>'<% } %>
        },
        CustomPageDefinitions
    );
});