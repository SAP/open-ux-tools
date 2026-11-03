window.suite = function () {
    'use strict';

    // eslint-disable-next-line
    var oSuite = new parent.jsUnitTestSuite(),
        sContextPath = location.pathname.substring(0, location.pathname.lastIndexOf('/') + 1);
    var xhr = new XMLHttpRequest();

    xhr.open("GET", "integration/AllJourneys.json", false);
    xhr.send(null);
    JSON.parse(xhr.responseText).forEach(function (name) {
        oSuite.addTestPage(sContextPath + "integration/opaTests.qunit.html?journey=" + name + "&env=karma");
    });

    return oSuite;
};