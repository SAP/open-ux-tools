/**
 * WARNING: This is a generated file. Changes made in this file will be lost when the file is regenerated.
 */
sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("<%- name%>ObjectPage journey");

        opaTest("Navigate to <%- name%>ObjectPage", function (Given, When, Then) {
            Given.iStartMyApp();
<% if (!hideFilterBar) { %>
            When.onThe<%- navigationParents.parentLRName%>.onFilterBar().iExecuteSearch();
<% } %>
            Then.onThe<%- navigationParents.parentLRName%>.onTable().iCheckRows();
            When.onThe<%- navigationParents.parentLRName%>.onTable().iPressRow(0);
<% if(navigationParents.parentOPName) { %>
            Then.onThe<%- navigationParents.parentOPName%>.iSeeThisPage();
            Then.onThe<%- navigationParents.parentOPName%>.onTable({ property: "<%- navigationParents.parentOPTableSection %>" }).iCheckRows();
            When.onThe<%- navigationParents.parentOPName%>.onTable({ property: "<%- navigationParents.parentOPTableSection %>" }).iPressRow(0);
<% } %>
            Then.onThe<%- name%>.iSeeThisPage();
        });

<% if (headerSections?.length > 0) { -%>
        opaTest("Check header facets of the Object Page", function (Given, When, Then) {
<% headerSections.forEach(function(section) { -%>
<% if (section.microChart) { -%>
            Then.onThe<%- name%>.onHeader().iCheckMicroChart("<%- section.title %>");
<% } else { -%>
            Then.onThe<%- name%>.onHeader().iCheckHeaderFacet({ facetId: "<%- section.facetId %>" });
<% if (section.form) { -%>
<% section.fields.forEach(function(field) { -%>
            Then.onThe<%- name%>.onHeader().iCheckFieldInFieldGroup({
                fieldGroup: "FieldGroup::<%- field.fieldGroupQualifier %>",
                field: "<%- field.field %>",
            });
<% }) -%>
<% } -%>
<% } -%>
<% }) -%>
        });
<% } -%>

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});