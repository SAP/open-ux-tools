sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("List Report journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iStartMyApp();
            Then.onThe<%- name %>.iSeeThisPage();
            <%_ if (filterBarItems && filterBarItems.length > 0) { -%>
                <%_ filterBarItems.forEach(function(item) { _%>
            Then.onThe<%- name%>.onFilterBar().iCheckFilterField("<%- item %>");
                <%_ }); -%>
            <%_ } -%>
            <%_ if (tableColumns && Object.keys(tableColumns).length > 0) { _%>
            Then.onThe<%- name %>.onTable().iCheckColumns(<%- Object.keys(tableColumns).length %>, <%- JSON.stringify(tableColumns) %>);
            <%_ } %>
        });

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});