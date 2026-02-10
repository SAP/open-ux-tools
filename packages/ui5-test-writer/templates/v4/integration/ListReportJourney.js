sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("ListReport journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iStartMyApp();
            <%_ startPages.forEach(function(pageName) { %>
            Then.onThe<%- pageName %>.iSeeThisPage();
            <%_ }); -%>
        });

        opaTest("Check filter bar", function (Given, When, Then) {
            <%_ if (listReportFeatures.filterBarItems && listReportFeatures.filterBarItems.length > 0) { -%>
                <%_ listReportFeatures.filterBarItems.forEach(function(item) { _%>
            Then.onThe<%- startLR%>.onFilterBar().iCheckFilterField("<%- item %>");
                <%_ }); -%>
            <%_ } -%>
        });

        opaTest("Check table columns and actions", function (Given, When, Then) {
            <%_ if (listReportFeatures.toolBarActions && listReportFeatures.toolBarActions.length > 0) { -%>
                <%_ listReportFeatures.toolBarActions.forEach(function(item) { _%>
            Then.onThe<%- startLR%>.onTable().iCheckAction("<%- item %>");
                <%_ }); -%>
            <%_ } -%>
            <%_ if (listReportFeatures.tableColumns && Object.keys(listReportFeatures.tableColumns).length > 0) { _%>
            Then.onThe<%- startLR %>.onTable().iCheckColumns(<%- Object.keys(listReportFeatures.tableColumns).length %>, <%- JSON.stringify(listReportFeatures.tableColumns) %>);
            <%_ } %>
        });

<% if (startLR) { %>
        opaTest("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            <% if (!hideFilterBar) { %>
            When.onThe<%- startLR%>.onFilterBar().iExecuteSearch();
            <%} %>
            Then.onThe<%- startLR%>.onTable().iCheckRows();
<% if (navigatedOP) { %>
            When.onThe<%- startLR%>.onTable().iPressRow(0);
            Then.onThe<%- navigatedOP%>.iSeeThisPage();
<%} %>
        });
<%} %>
        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});