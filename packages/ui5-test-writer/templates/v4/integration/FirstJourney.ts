import opaTest from "sap/ui/test/opaQunit";
import {
<%- pages.map((page) => {return '\t' + page.targetKey;}).join(',\n')%>,
	JourneyRunner
} from "./pages/JourneyRunner";

QUnit.module("First journey");

opaTest("Start application", function (Given, When, Then) {
	Given.iStartMyApp();
<%_ startPages.forEach(function(pageName) { %>
	Then.<%- pageName %>.iSeeThisPage();
<%_ if (filterBarItems && filterBarItems.length > 0) { -%>
	<%_ filterBarItems.forEach(function(item) { _%>
	Then.<%- pageName%>.onFilterBar().iCheckFilterField("<%- item %>");
	<%_ }); -%>
<%_ } -%>
<%_ if (tableColumns && Object.keys(tableColumns).length > 0) { _%>
	Then.<%- pageName %>.onTable().iCheckColumns(<%- Object.keys(tableColumns).length %>, <%- JSON.stringify(tableColumns) %>);
<%_ } %>
<%_ }); -%>
});

<% if (startLR) { %>
opaTest("Navigate to ObjectPage", function (Given, When, Then) {
	// Note: this test will fail if the ListReport page doesn't show any data
	<% if (!hideFilterBar) { %>
	When.<%- startLR%>.onFilterBar().iExecuteSearch();
	<%} %>
	Then.<%- startLR%>.onTable().iCheckRows();
<% if (navigatedOP) { %>
	When.<%- startLR%>.onTable().iPressRow(0);
	Then.<%- navigatedOP%>.iSeeThisPage();
<%} %>
});
<%} %>
opaTest("Teardown", function (Given, When, Then) { 
	// Cleanup
	Given.iTearDownMyApp();
});
