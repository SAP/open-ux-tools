sap.ui.define([
    "sap/fe/test/JourneyRunner",
<%- pages.map((page) => {return "\t\"" + page.appPath + '/test/integration/pages/' + page.targetKey + "\"";}).join(',\n')%>
], function (JourneyRunner, <%- pages.map(function(page) {return page.targetKey;}).join(', ')%>) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('<%- appPath %>') + '/<%- htmlTarget %>',
        pages: {
<%- pages.map((page) => {return '\t\t\tonThe' + page.targetKey + ': ' + page.targetKey}).join(',\n')%>
        },
        async: true
    });

    return runner;
});

