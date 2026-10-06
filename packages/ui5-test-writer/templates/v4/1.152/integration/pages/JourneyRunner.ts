import JourneyRunner from "sap/fe/test/JourneyRunner";
<% if (pages.some((p) => p.template === 'ListReport')) { -%>
import ListReport from "sap/fe/test/ListReport";
<% } -%>
<% if (pages.some((p) => p.template === 'ObjectPage')) { -%>
import ObjectPage from "sap/fe/test/ObjectPage";
<% } -%>
<% if (pages.some((p) => p.template === 'FPM')) { -%>
import TemplatePage from "sap/fe/test/TemplatePage";
<% } -%>
<%- pages.map((page) => 'import Custom' + page.targetKey + 'Generated from "./' + page.targetKey + '.gen";').join('\n') %>

const runner = new JourneyRunner({
    launchUrl: sap.ui.require.toUrl("<%- appPath %>") + "/<%- htmlTarget %>",
    pages: {
<%- pages.map((page) =>
    page.template === 'FPM'
? '        onThe' + page.targetKey + 'Generated: new (TemplatePage as unknown as new (id: string, defs: object) => object)(\n' +
'            "' + page.appID + '::' + page.componentID + '",\n' +
'            Custom' + page.targetKey + 'Generated\n' +
'        )'
: '        onThe' + page.targetKey + 'Generated: new ' + page.template + '(\n' +
'            {\n' +
'                appId: "' + page.appID + '",\n' +
'                componentId: "' + page.componentID + '",\n' +
'                entitySet: "' + (page.entitySet || '') + '",\n' +
'                contextPath: "' + (page.contextPath || '') + '"\n' +
'            },\n' +
'            Custom' + page.targetKey + 'Generated\n' +
'        )'
).join(',\n') %>
    },
    async: true
});

export default runner;
