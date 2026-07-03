import opaTest from "sap/ui/test/opaQunit";
import type { Given, When, Then } from "./types/OpaJourneyTypes";
import runner from "./pages/JourneyRunner";

function journey() {
    QUnit.module("First journey");

    opaTest("Start application", function (Given: Given, _When: When<% if (startLR) { %>, Then: Then<% } else { %>, _Then: Then<% } %>) {
        Given.iStartMyApp();
        <% if (startLR) { %>Then.onThe<%- startLR %>Generated.iSeeThisPage();<%} %>
    });

<% if (startLR) { %>
    opaTest("Navigate to ObjectPage", function (_Given: Given, When: When, Then: Then) {
        // Note: this test will fail if the ListReport page doesn't show any data
        <% if (!hideFilterBar) { %>
        When.onThe<%- startLR%>Generated.onFilterBar().iExecuteSearch();
        <%} %>
        Then.onThe<%- startLR%>Generated.onTable("").iCheckRows();
<% if (navigatedOP) { %>
        When.onThe<%- startLR%>Generated.onTable("").iPressRow(0);
        Then.onThe<%- navigatedOP%>Generated.iSeeThisPage();
<%} %>
    });
<%} %>
    opaTest("Teardown", function (Given: Given) {
        // Cleanup
        Given.iTearDownMyApp();
    });
}

runner.run([journey]);
