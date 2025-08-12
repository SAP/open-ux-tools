sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (test, JourneyRunner) {
    "use strict";

    function run() {
        QUnit.module("First journey");

        test("Start application", function (Given, When, Then) {
            Given.iStartMyApp();
<% startPages.forEach(function(pageName) { %>
            Then.onThe<%- pageName%>.iSeeThisPage();
<% });%>
        });

<% if (startLR) { %>
        test("Navigate to ObjectPage", function (Given, When, Then) {
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
        test("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    JourneyRunner.run({}, run)
});