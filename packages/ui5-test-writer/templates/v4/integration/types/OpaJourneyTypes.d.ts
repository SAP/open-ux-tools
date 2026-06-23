import type Opa5 from "sap/ui/test/Opa5";
<% if (pages.some(p => p.template === 'ListReport')) { -%>
import type { actions as ListReportActions, assertions as ListReportAssertions } from "sap/fe/test/ListReport";
<% } -%>
<% if (pages.some(p => p.template === 'ObjectPage')) { -%>
import type { actions as ObjectPageActions, assertions as ObjectPageAssertions } from "sap/fe/test/ObjectPage";
<% } -%>
<% if (pages.some(p => p.template === 'ListReport' || p.template === 'ObjectPage')) { -%>
import type { actions as TemplatePageActions, assertions as TemplatePageAssertions } from "sap/fe/test/TemplatePage";
<% } -%>
import type Shell from "sap/fe/test/Shell";
import type BaseArrangements from "sap/fe/test/BaseArrangements";
<% pages.filter((p) => p.template === 'ListReport' || p.template === 'ObjectPage').forEach(function(page) { -%>
import type { actions as <%- page.targetKey %>GeneratedCustomActions, assertions as <%- page.targetKey %>GeneratedCustomAssertions } from "../pages/<%- page.targetKey %>.gen";
<% }); -%>

export type Given = Opa5 & BaseArrangements & {
    iTearDownMyApp: () => Given;
    iStartMyApp: (sAppHash?: string, mInUrlParameters?: object) => Given;
    and: Given;
};

export type When = Opa5 & BaseArrangements & {
<% pages.forEach(function(page) { -%>
<% if (page.template === 'ListReport') { -%>
    onThe<%- page.targetKey %>Generated: Opa5 & ListReportActions & TemplatePageActions & typeof <%- page.targetKey %>GeneratedCustomActions;
<% } else if (page.template === 'ObjectPage') { -%>
    onThe<%- page.targetKey %>Generated: Opa5 & ObjectPageActions & TemplatePageActions & typeof <%- page.targetKey %>GeneratedCustomActions;
<% } -%>
<% }); -%>
    onTheShell: Shell;
};

export type Then = Opa5 & BaseArrangements & {
<% pages.forEach(function(page) { -%>
<% if (page.template === 'ListReport') { -%>
    onThe<%- page.targetKey %>Generated: Opa5 & ListReportAssertions & TemplatePageAssertions & typeof <%- page.targetKey %>GeneratedCustomAssertions;
<% } else if (page.template === 'ObjectPage') { -%>
    onThe<%- page.targetKey %>Generated: Opa5 & ObjectPageAssertions & TemplatePageAssertions & typeof <%- page.targetKey %>GeneratedCustomAssertions;
<% } -%>
<% }); -%>
    onTheShell: Shell;
};
