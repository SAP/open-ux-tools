import JourneyRunner from "sap/fe/test/JourneyRunner";
<%- pages.map((page) => 'import ' + page.targetKey + ' from "./' + page.targetKey + '";').join('\n') %>

const runner = new JourneyRunner({
    launchUrl: sap.ui.require.toUrl("<%- appPath %>") + "/<%- htmlTarget %>",
    pages: {
<%- pages.map((page) => '        onThe' + page.targetKey + ': ' + page.targetKey).join(',\n') %>
    },
    async: true
});

export default runner;
