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
            <%_ if (filterBarItems && filterBarItems.length > 0) { -%>
                <%_ filterBarItems.forEach(function(item) { _%>
            Then.onThe<%- startLR%>.onFilterBar().iCheckFilterField("<%- item %>");
                <%_ }); -%>
            <%_ } -%>
        });

        opaTest("Check table columns and actions", function (Given, When, Then) {
            <%_ if (toolBarActions && toolBarActions.length > 0) { -%>
                <%_ if (createButton.visible) { _%>
                Then.onThe<%- startLR%>.onTable().iCheckCreate({ visible: true });
                // Then.onthe<%- startLR%>.onTable().iPressCreate();
                <%_ } _%>
                <%_ if (deleteButton.visible) { _%>
                // Then.onthe<%- startLR%>.onTable().iPressDelete();
                Then.onThe<%- startLR%>.onTable().iCheckDelete({ visible: true });
                <%_ } _%>
                <%_ toolBarActions.forEach(function(item) { _%>
                    <%_ if (item.visible) { _%>
                    // Then.onThe<%- startLR%>.onTable().iPressAction("<%- item.label %>");
                    Then.onThe<%- startLR%>.onTable().iCheckAction("<%- item.label %>", { enabled: <%- item.enabled === true %> });
                    <%_ } _%>
                <%_ }); -%>
            <%_ } -%>
            <%_ if (tableColumns && Object.keys(tableColumns).length > 0) { -%>
            Then.onThe<%- startLR %>.onTable().iCheckColumns(<%- Object.keys(tableColumns).length %>, <%- JSON.stringify(tableColumns) %>);
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