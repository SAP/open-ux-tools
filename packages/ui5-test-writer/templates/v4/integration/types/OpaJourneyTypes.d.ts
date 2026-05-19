import type Opa5 from "sap/ui/test/Opa5";
<% if (pages.some(p => p.template === 'ListReport')) { -%>
import type { actions as ListReportActions, assertions as ListReportAssertions } from "sap/fe/test/ListReport";
<% } -%>
<% if (pages.some(p => p.template === 'ObjectPage')) { -%>
import type { actions as ObjectPageActions, assertions as ObjectPageAssertions } from "sap/fe/test/ObjectPage";
<% } -%>
import type { actions as TemplatePageActions, assertions as TemplatePageAssertions } from "sap/fe/test/TemplatePage";
import type Shell from "sap/fe/test/Shell";
import type BaseArrangements from "sap/fe/test/BaseArrangements";
<% pages.forEach(function(page) { -%>
import type { actions as <%- page.targetKey %>CustomActions, assertions as <%- page.targetKey %>CustomAssertions } from "<%- appPath %>/test/integration/pages/<%- page.targetKey %>";
<% }); -%>

export type Given = Opa5 & BaseArrangements & {
    iTearDownMyApp: () => Given;
    iStartMyApp: (sAppHash?: string, mInUrlParameters?: object) => Given;
    and: Given;
};

export type When = Opa5 & BaseArrangements & {
<% pages.forEach(function(page) { -%>
<% if (page.template === 'ListReport') { -%>
    onThe<%- page.targetKey %>: Opa5 & ListReportActions & TemplatePageActions & typeof <%- page.targetKey %>CustomActions;
<% } else if (page.template === 'ObjectPage') { -%>
    onThe<%- page.targetKey %>: Opa5 & ObjectPageActions & TemplatePageActions & typeof <%- page.targetKey %>CustomActions;
<% } -%>
<% }); -%>
    onTheShell: Shell;
};

export type Then = Opa5 & BaseArrangements & {
<% pages.forEach(function(page) { -%>
<% if (page.template === 'ListReport') { -%>
    onThe<%- page.targetKey %>: Opa5 & ListReportAssertions & TemplatePageAssertions & typeof <%- page.targetKey %>CustomAssertions;
<% } else if (page.template === 'ObjectPage') { -%>
    onThe<%- page.targetKey %>: Opa5 & ObjectPageAssertions & TemplatePageAssertions & typeof <%- page.targetKey %>CustomAssertions;
<% } -%>
<% }); -%>
    onTheShell: Shell;
};
