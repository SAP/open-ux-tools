sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: '<%- appID %>',
            componentId: '<%- componentID %>',<% if (locals.contextPath) { %>
            contextPath: '<%- contextPath %>'<% } else if (locals.entitySet) { %>
            entitySet: '<%- entitySet %>'<% } %>
        },
        CustomPageDefinitions
    );
});