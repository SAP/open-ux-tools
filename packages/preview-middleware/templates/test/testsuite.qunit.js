window.suite = function () {
    const oSuite = new parent.jsUnitTestSuite();
    var sContextPath = location.pathname.substring(0, location.pathname.lastIndexOf("/") + 1);
<% for (const path of locals.testPaths) { %>
    oSuite.addTestPage(sContextPath + "<%- path %>");
<% } %>
    return oSuite;
}