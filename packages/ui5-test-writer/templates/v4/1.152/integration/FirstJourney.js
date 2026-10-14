sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iResetMockData({ ServiceUri: <%- JSON.stringify(serviceUri) %> });
            Given.iResetTestData();
            Given.iStartMyApp();
            <% if (startLR) { %>Then.onThe<%- startLR %>Generated.iSeeThisPage();<%} %>
        });

<% if (startLR) { %>
        opaTest("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            <% if (!hideFilterBar) { %>
            When.onThe<%- startLR %>Generated.onFilterBar().iExecuteSearch();
            <%} %>
            Then.onThe<%- startLR %>Generated.onTable().iCheckRows();
<% if (navigatedOP) { %>
            When.onThe<%- startLR %>Generated.onTable().iPressRow(0);
            Then.onThe<%- navigatedOP %>Generated.iSeeThisPage();
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