import JourneyRunner from "sap/fe/test/JourneyRunner";
<% if (pages.some((p) => p.template === 'ListReport')) { -%>
import ListReport from "sap/fe/test/ListReport";
<% } -%>
<% if (pages.some((p) => p.template === 'ObjectPage')) { -%>
import ObjectPage from "sap/fe/test/ObjectPage";
<% } -%>
<%- pages.map((page) => 'import Custom' + page.targetKey + 'Generated from "./' + page.targetKey + '.gen";').join('\n') %>

const runner = new JourneyRunner({
    launchUrl: sap.ui.require.toUrl("<%- appPath %>") + "/<%- htmlTarget %>",
    pages: {
<%- pages.map((page) => {
    const innerProps = [
        '                appId: "' + page.appID + '"',
        '                componentId: "' + page.componentID + '"'
    ];
    if (page.entitySet) {
        innerProps.push('                entitySet: "' + page.entitySet + '"');
    }
    if (page.contextPath) {
        innerProps.push('                contextPath: "' + page.contextPath + '"');
    }
    return (
        '        onThe' + page.targetKey + 'Generated: new ' + page.template + '(\n' +
        '            {\n' +
        innerProps.join(',\n') + '\n' +
        '            },\n' +
        '            Custom' + page.targetKey + 'Generated\n' +
        '        )'
    );
}).join(',\n') %>
    },
    async: true
});

export default runner;
