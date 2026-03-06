sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("FPM journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iStartMyApp();
            <%_ startPages.forEach(function(pageName) { %>
            Then.onThe<%- pageName %>.iSeeThisPage();
            <%_ if (fpmFeatures.filterBarItems && fpmFeatures.filterBarItems.length > 0) { -%>
                <%_ fpmFeatures.filterBarItems.forEach(function(item) { _%>
            Then.onThe<%- pageName%>.onFilterBar().iCheckFilterField("<%- item %>");
                <%_ }); -%>
            <%_ } -%>
            <%_ if (fpmFeatures.tableColumns && Object.keys(fpmFeatures.tableColumns).length > 0) { _%>
            Then.onThe<%- pageName %>.onTable().iCheckColumns(<%- Object.keys(fpmFeatures.tableColumns).length %>, <%- JSON.stringify(fpmFeatures.tableColumns) %>);
            <%_ } %>
            <%_ }); -%>
        });

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});