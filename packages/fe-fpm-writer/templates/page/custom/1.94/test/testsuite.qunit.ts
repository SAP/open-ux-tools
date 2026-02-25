/* global QUnit */
// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
(window as any).suite = function () {
	"use strict";
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
	const oSuite = (new (QUnit as any).TestSuite("Test Suite for <%= id %>"));
	const sContextPath = location.pathname.substring(0, location.pathname.lastIndexOf("/") + 1);

	// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
	oSuite.addTestPage(sContextPath + "integration/opaTests.qunit.html");

	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	return oSuite;
};
