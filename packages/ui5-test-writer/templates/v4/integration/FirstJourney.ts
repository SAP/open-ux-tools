import opaTest from "sap/ui/test/opaQunit";
import type { Given, When, Then } from "<%- appPath %>/test/integration/types/OpaJourneyTypes";
import runner from "./pages/JourneyRunner";

function journey() {
    QUnit.module("First journey");

    opaTest("Start application", function (Given: Given, When: When, Then: Then) {
        Given.iStartMyApp();
        <% if (startLR) { %>Then.onThe<%- startLR %>.iSeeThisPage();<%} %>
    });

<% if (startLR) { %>
    opaTest("Navigate to ObjectPage", function (Given: Given, When: When, Then: Then) {
        // Note: this test will fail if the ListReport page doesn't show any data
        <% if (!hideFilterBar) { %>
        When.onThe<%- startLR%>.onFilterBar().iExecuteSearch();
        <%} %>
        Then.onThe<%- startLR%>.onTable("").iCheckRows();
<% if (navigatedOP) { %>
        When.onThe<%- startLR%>.onTable("").iPressRow(0);
        Then.onThe<%- navigatedOP%>.iSeeThisPage();
<%} %>
    });
<%} %>
    opaTest("Teardown", function (Given: Given, When: When, Then: Then) {
        // Cleanup
        Given.iTearDownMyApp();
    });
}

runner.run([journey]);
