window.suite = function () {
    const oSuite = new parent.jsUnitTestSuite();
<% for (const path of locals.testPaths) { %>
    oSuite.addTestPage("<%- path %>");
<% } %>
    return oSuite;
}