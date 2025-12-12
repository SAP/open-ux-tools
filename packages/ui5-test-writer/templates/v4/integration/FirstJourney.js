sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iStartMyApp();
<% startPages.forEach(function(pageName) { %>
            Then.onThe<%- pageName%>.iSeeThisPage();
            <% if (filterBarItems && filterBarItems.length > 0) { %>
                <% filterBarItems.forEach(function(item) { %>
            Then.onThe<%- pageName%>.onFilterBar().iCheckFilterField("<%- item %>");
                <% }); %>
            <% } %>

            <% if (tableColumns && Object.keys(tableColumns).length > 0) { %>
            Then.onThe<%- pageName %>.onTable().iCheckColumns(<%- Object.keys(tableColumns).length %>, <%- JSON.stringify(tableColumns) %>);
            <% } %>
<% });%>
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