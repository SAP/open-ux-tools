/*
 * AppName testsuite
 */
QUnit.config.testTimeout = 60000;

// code alias
jQuery.sap.registerModulePath("fin.co.costcenter.manage.test", "test-files");

// code alias
jQuery.sap.require("fin.co.costcenter.manage.test.ModulePathForTests");
fin.co.costcenter.manage.test.ModulePathForTests.registerModulePathForTests("fin.co.costcenter.manage");

// test alias
jQuery.sap.registerModulePath( "fin.co.costcenter.manage.test", "test-files" );
//jQuery.sap.registerModulePath( "fin.co.costcenter.manage.testview", "testview" );
// tests to run
//jQuery.sap.require( "fin.co.costcenter.manage.testview.ContactsTest" );
//jQuery.sap.require( "fin.co.costcenter.manage.test.SimpleTest" );
jQuery.sap.require( "fin.co.costcenter.manage.test.FormatterTest" );
jQuery.sap.require( "fin.co.costcenter.manage.test.UtilitiesTest" );
jQuery.sap.require( "fin.co.costcenter.manage.test.ComponentTest" );
jQuery.sap.require( "fin.co.costcenter.manage.test.ViewTest" );