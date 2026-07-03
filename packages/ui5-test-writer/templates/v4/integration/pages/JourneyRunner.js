sap.ui.define([
    "sap/fe/test/JourneyRunner"<% if (pages.length > 0) { %>,
<%- pages.map((page) => {return "\t\"" + page.appPath + '/test/integration/pages/' + page.fileName + "\"";}).join(',\n')%>
<% } %>], function (JourneyRunner<% if (pages.length > 0) { %>, <%- pages.map(function(page) {return page.targetKey + "Generated";}).join(', ') %><% } %>) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('<%- appPath %>') + '/<%- htmlTarget %>',
        pages: {<% if (pages.length > 0) { %>
<%- pages.map((page) => {return '\t\t\tonThe' + page.targetKey + 'Generated: ' + page.targetKey + "Generated"}).join(',\n')%>
        <% } %>},
        async: true
    });

    return runner;
});

