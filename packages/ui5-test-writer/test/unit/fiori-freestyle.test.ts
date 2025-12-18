import { generateFreestyleOPAFiles } from '../../src';
import { join } from 'node:path';
import { create as createStorage } from 'mem-fs';
import { create, type Editor } from 'mem-fs-editor';
import type { Logger } from '@sap-ux/logger';
import { t } from '../../src/i18n';
import { toMatchFolder } from '@sap-ux/jest-file-matchers';
import * as fileSystem from 'node:fs';
import { rimraf } from 'rimraf';
import { promisify } from 'util';

expect.extend({ toMatchFolder });

describe('ui5-test-writer - Freestyle OPA Integration tests', () => {
    let fs: Editor | undefined;
    const testOutputDir = join(__dirname, '../test-output');
    const expectedOutputPath = join(__dirname, './expected-output');

    beforeEach(async () => {
        await rimraf(testOutputDir);
        fileSystem.mkdirSync(testOutputDir, { recursive: true });
        fs = create(createStorage());
    });

    /** Helper function to remove whitespaces */
    function removeSpaces(str: string) {
        return str.replace(/\s+/g, '');
    }

    test('Generate OPA test files correctly when typescript is enabled', async () => {
        const opaConfig = {
            appId: 'test-app-typescript',
            applicationTitle: 'App test',
            applicationDescription: 'App description',
            enableTypeScript: true,
            viewName: 'view-test',
            ui5Version: '1.71.0'
        };
        const basePath = join('some/path');
        const testOutputPath = join(basePath, 'webapp/test');
        fs = await generateFreestyleOPAFiles(basePath, opaConfig, fs);

        const expectedFiles = [
            'integration/NavigationJourney.ts',
            'integration/opaTests.qunit.html',
            'integration/pages/AppPage.ts',
            'integration/pages/view-testPage.ts',
            'testsuite.qunit.ts',
            'unit/controller/view-testPage.controller.ts',
            'unit/unitTests.qunit.html',
            'unit/unitTests.qunit.ts'
        ];
        expectedFiles.map((file: string) => {
            expect(fs?.exists(join(testOutputPath, file))).toBe(true);
        });
        // check tsconfig.json
        const tsConfigJson = fs?.readJSON(join(basePath, 'tsconfig.json'));
        expect(tsConfigJson).toEqual({
            'compilerOptions': {
                'paths': {
                    'unit/*': ['./webapp/test/unit/*'],
                    'integration/*': ['./webapp/test/integration/*']
                }
            }
        });

        // check testsuite.qunit.html
        const testSuiteHTML = fs?.read(join(testOutputPath, 'testsuite.qunit.html'));
        expect(removeSpaces(testSuiteHTML)).toBe(
            removeSpaces(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>
                  QUnit test suite
                </title>
                <script src="../resources/sap/ui/qunit/qunit-redirect.js"></script>
                <script src="testsuite.qunit.js" data-sap-ui-testsuite></script>
              </head>
              <body></body>
        </html>`)
        );

        // check unit/unitTests.qunit.ts
        const unitTestQUnit = fs?.read(join(testOutputPath, 'unit/unitTests.qunit.ts'));
        expect(removeSpaces(unitTestQUnit)).toBe(
            removeSpaces(`
            /* global QUnit */
            // https://api.qunitjs.com/config/autostart/
            QUnit.config.autostart = false;
            
            // import all your QUnit tests here
            void Promise.all([
                import("unit/controller/view-testPage.controller")
            ]).then(() => {
                QUnit.start();
        });`)
        );

        // check unit/unitTests.qunit.html
        const unitTestHTML = fs?.read(join(testOutputPath, 'unit/unitTests.qunit.html'));
        expect(removeSpaces(unitTestHTML)).toBe(
            removeSpaces(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Unit tests for ${opaConfig.appId}</title>
                <script
                        id="sap-ui-bootstrap"
                        src="../../resources/sap-ui-core.js"
                        data-sap-ui-resourceroots='{
                                "${opaConfig.appId}": "../../",
                                "unit": "."
                        }'
                        data-sap-ui-async="true"
                        data-sap-ui-oninit="module:unit/unitTests.qunit">
                </script>
                <link rel="stylesheet" type="text/css" href="../../resources/sap/ui/thirdparty/qunit-2.css">
                <script src="../../resources/sap/ui/thirdparty/qunit-2.js"></script>
                <script src="../../resources/sap/ui/qunit/qunit-junit.js"></script>
                <script src="../../resources/sap/ui/qunit/qunit-coverage.js"></script>
                <script src="../../resources/sap/ui/thirdparty/sinon.js"></script>
                <script src="../../resources/sap/ui/thirdparty/sinon-qunit.js"></script>
            </head>
            <body>
                <div id="qunit"></div>
                <div id="qunit-fixture"></div>
            </body>
            </html>`)
        );

        // check unit/controller/view-testPage.controller.ts
        const viewTestController = fs?.read(join(testOutputPath, 'unit/controller/view-testPage.controller.ts'));
        expect(removeSpaces(viewTestController)).toBe(
            removeSpaces(`
            /*global QUnit*/
            import Controller from "${opaConfig.appId}/controller/${opaConfig.viewName}.controller";
            
            QUnit.module("${opaConfig.viewName} Controller");
            
            QUnit.test("I should test the ${opaConfig.viewName} controller", function (assert: Assert) {
                const oAppController = new Controller("${opaConfig.viewName}");
                oAppController.onInit();
                assert.ok(oAppController);
            });
        `)
        );

        // check test/testsuite.qunit.ts
        const testSuiteQUnit = fs?.read(join(testOutputPath, 'testsuite.qunit.ts'));
        expect(removeSpaces(testSuiteQUnit)).toBe(
            removeSpaces(`
            /* global window, parent, location */
    
            // eslint-disable-next-line @sap-ux/fiori-tools/sap-no-global-define,@typescript-eslint/ban-ts-comment
            // @ts-nocheck
            window.suite = function() {
                // eslint-disable-next-line
                var oSuite = new parent.jsUnitTestSuite(),
                        sContextPath = location.pathname.substring(0, location.pathname.lastIndexOf("/") + 1);
            
                oSuite.addTestPage(sContextPath + "unit/unitTests.qunit.html");
                oSuite.addTestPage(sContextPath + "integration/opaTests.qunit.html");
            
                return oSuite;
            };
        `)
        );

        // check integration/pages/view-testPage.ts
        const viewTestPage = fs?.read(join(testOutputPath, 'integration/pages/view-testPage.ts'));
        expect(removeSpaces(viewTestPage)).toBe(
            removeSpaces(`
            import Opa5 from "sap/ui/test/Opa5";
    
            const sViewName = "${opaConfig.viewName}";
            
            export default class ${opaConfig.viewName}Page extends Opa5 {
                // Actions
            
            
                // Assertions
                iShouldSeeThePageView() {
                        return this.waitFor({
                                id: "page",
                                viewName: sViewName,
                                success: function () {
                                        Opa5.assert.ok(true, "The " + sViewName + " view is displayed");
                                },
                                errorMessage: "Did not find the " + sViewName + " view"
                        });
                }
            
            }`)
        );

        // check integration/pages/AppPage.ts
        const appPage = fs?.read(join(testOutputPath, 'integration/pages/AppPage.ts'));
        expect(removeSpaces(appPage)).toBe(
            removeSpaces(`
            import Opa5 from "sap/ui/test/Opa5";
    
            const sViewName = "App";
            
            export default class AppPage extends Opa5 {
                // Actions
            
            
                // Assertions
                iShouldSeeTheApp() {
                        return this.waitFor({
                                id: "app",
                                viewName: sViewName,
                                success: function () {
                                        Opa5.assert.ok(true, "The " + sViewName + " view is displayed");
                                },
                                errorMessage: "Did not find the " + sViewName + " view"
                        });
                }
            
            }
        `)
        );

        // check integration/opaTests.qunit.ts
        const opaTests = fs?.read(join(testOutputPath, 'integration/opaTests.qunit.ts'));
        expect(removeSpaces(opaTests)).toBe(
            removeSpaces(`
            /* global QUnit */
            // https://api.qunitjs.com/config/autostart/
            QUnit.config.autostart = false;
            
            // import all your OPA journeys here
            void Promise.all([
                import("integration/NavigationJourney")
            ]).then(() => {
                QUnit.start();
            });`)
        );

        // check integration/opaTests.qunit.html
        const opaTestsHTML = fs?.read(join(testOutputPath, 'integration/opaTests.qunit.html'));
        expect(removeSpaces(opaTestsHTML)).toBe(
            removeSpaces(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8" />
                <title>Integration tests for Basic Template</title>
            
                <script
                        id="sap-ui-bootstrap"
                        src="../../resources/sap-ui-core.js"
                        data-sap-ui-theme=""
                        data-sap-ui-resourceroots='{
                                "${opaConfig.appId}": "../../",
                                "integration": "./"
                        }'
                        data-sap-ui-animation="false"
                        data-sap-ui-compatVersion="edge"
                        data-sap-ui-async="true"
                        data-sap-ui-preload="async"
                        data-sap-ui-oninit="module:integration/opaTests.qunit">
                </script>
                <link rel="stylesheet" type="text/css" href="../../resources/sap/ui/thirdparty/qunit-2.css">
                <script src="../../resources/sap/ui/thirdparty/qunit-2.js"></script>
                <script src="../../resources/sap/ui/qunit/qunit-junit.js"></script>
            </head>
            <body>
                <div id="qunit"></div>
                <div id="qunit-fixture"></div>
            </body>
            </html>
        `)
        );

        // check integration/NavigationJourney.ts
        const navigationJourney = fs?.read(join(testOutputPath, 'integration/NavigationJourney.ts'));
        expect(removeSpaces(navigationJourney)).toBe(
            removeSpaces(`
            /*global QUnit*/
            import opaTest from "sap/ui/test/opaQunit";
            import AppPage from "./pages/AppPage";
            import ViewPage from "./pages/view-testPage";
            
            import Opa5 from "sap/ui/test/Opa5";
            
            QUnit.module("Navigation Journey");
            
            const onTheAppPage = new AppPage();
            const onTheViewPage = new ViewPage();
            Opa5.extendConfig({
                viewNamespace: "test-app-typescript.view.",
                autoWait: true
            });
            
            opaTest("Should see the initial page of the app", function () {
                // Arrangements
                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                onTheAppPage.iStartMyUIComponent({
                        componentConfig: {
                                name: "${opaConfig.appId}"
                        }
                });
            
                // Assertions
                onTheAppPage.iShouldSeeTheApp();
                onTheViewPage.iShouldSeeThePageView();
            
            
                // Cleanup
                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                onTheAppPage.iTeardownMyApp();
            });
        `)
        );
    });

    test('Generate OPA test files correctly when typescript is not enabled', async () => {
        const opaConfig = {
            appId: 'test-app-js',
            applicationTitle: 'App test',
            applicationDescription: 'App description',
            viewName: 'view-test',
            ui5Version: '1.71.0'
        };
        const basePath = join('some/path');
        const testOutputPath = join(basePath, 'webapp/test');
        fs = await generateFreestyleOPAFiles(basePath, opaConfig, fs);

        const expectedFiles = [
            'integration/NavigationJourney.js',
            'integration/opaTests.qunit.html',
            'integration/pages/App.js',
            'integration/pages/view-test.js',
            'testsuite.qunit.js',
            'unit/controller/view-test.controller.js',
            'unit/unitTests.qunit.html',
            'unit/unitTests.qunit.js'
        ];
        expectedFiles.map((file: string) => {
            expect(fs?.exists(join(testOutputPath, file))).toBe(true);
        });

        // check unit/unitTests.qunit.js
        const unitTestQUnit = fs?.read(join(testOutputPath, 'unit/unitTests.qunit.js'));
        expect(removeSpaces(unitTestQUnit)).toBe(
            removeSpaces(`
            /* global QUnit */
            QUnit.config.autostart = false;

            sap.ui.getCore().attachInit(function () {
                "use strict";

                sap.ui.require([
                        "test-app-js/test/unit/AllTests"
                ], function () {
                        QUnit.start();
                });
            });`)
        );

        // check unit/controller/view-test.controller.js
        const viewTestController = fs?.read(join(testOutputPath, 'unit/controller/view-test.controller.js'));
        expect(removeSpaces(viewTestController)).toBe(
            removeSpaces(`
            /*global QUnit*/

            sap.ui.define([
                "test-app-js/controller/view-test.controller"
            ], function (Controller) {
                "use strict";

                QUnit.module("view-test Controller");

                QUnit.test("I should test the view-test controller", function (assert) {
                        var oAppController = new Controller();
                        oAppController.onInit();
                        assert.ok(oAppController);
                });

            });
        `)
        );

        // check test/testsuite.qunit.js
        const testSuiteQUnit = fs?.read(join(testOutputPath, 'testsuite.qunit.js'));
        expect(removeSpaces(testSuiteQUnit)).toBe(
            removeSpaces(`
            /* global window, parent, location */

            // eslint-disable-next-line @sap-ux/fiori-tools/sap-no-global-define
            window.suite = function() {
                "use strict";

                // eslint-disable-next-line
                var oSuite = new parent.jsUnitTestSuite(),

                sContextPath = location.pathname.substring(0, location.pathname.lastIndexOf('/') + 1);
                oSuite.addTestPage(sContextPath + 'unit/unitTests.qunit.html');
                oSuite.addTestPage(sContextPath + 'integration/opaTests.qunit.html');

                return oSuite;
            };
        `)
        );

        // check integration/pages/view-test.js
        const viewTest = fs?.read(join(testOutputPath, 'integration/pages/view-test.js'));
        expect(removeSpaces(viewTest)).toBe(
            removeSpaces(`
            sap.ui.define([
                "sap/ui/test/Opa5"
            ], function (Opa5) {
                "use strict";
                var sViewName = "view-test";

                Opa5.createPageObjects({
                        onTheViewPage: {

                                actions: {},

                                assertions: {

                                        iShouldSeeThePageView: function () {
                                                return this.waitFor({
                                                        id: "page",
                                                        viewName: sViewName,
                                                        success: function () {
                                                                Opa5.assert.ok(true, "The " + sViewName + " view is displayed");
                                                        },
                                                        errorMessage: "Did not find the " + sViewName + " view"
                                                });
                                        }
                                }
                        }
                });

            });`)
        );

        // check integration/pages/App.js
        const app = fs?.read(join(testOutputPath, 'integration/pages/App.js'));
        expect(removeSpaces(app)).toBe(
            removeSpaces(`
            sap.ui.define([
                "sap/ui/test/Opa5"
            ], function (Opa5) {
                "use strict";
                var sViewName = "App";

                Opa5.createPageObjects({
                        onTheAppPage: {

                                actions: {},

                                assertions: {

                                        iShouldSeeTheApp: function () {
                                                return this.waitFor({
                                                        id: "app",
                                                        viewName: sViewName,
                                                        success: function () {
                                                                Opa5.assert.ok(true, "The " + sViewName + " view is displayed");
                                                        },
                                                        errorMessage: "Did not find the " + sViewName + " view"
                                                });
                                        }
                                }
                        }
                });

            });
        `)
        );

        // check integration/opaTests.qunit.js
        const opaTests = fs?.read(join(testOutputPath, 'integration/opaTests.qunit.js'));
        expect(removeSpaces(opaTests)).toBe(
            removeSpaces(`
            /* global QUnit */

            sap.ui.require(["test-app-js/test/integration/AllJourneys"
            ], function () {
                QUnit.config.autostart = false;
                QUnit.start();
            });`)
        );

        // check integration/NavigationJourney.js
        const navigationJourney = fs?.read(join(testOutputPath, 'integration/NavigationJourney.js'));
        expect(removeSpaces(navigationJourney)).toBe(
            removeSpaces(`
            /*global QUnit*/

            sap.ui.define([
                "sap/ui/test/opaQunit",
                "./pages/App",
                "./pages/view-test"
            ], function (opaTest) {
                "use strict";

                QUnit.module("Navigation Journey");

                opaTest("Should see the initial page of the app", function (Given, When, Then) {
                        // Arrangements
                        Given.iStartMyApp();

                        // Assertions
                        Then.onTheAppPage.iShouldSeeTheApp();
                        Then.onTheViewPage.iShouldSeeThePageView();

                        //Cleanup
                        Then.iTeardownMyApp();
                });
            });
        `)
        );
    });

    test('Generate OPA test files correctly when ui5Version is 1.120.0', async () => {
        const opaConfig = {
            appId: 'test-app-typescript',
            applicationTitle: 'App test',
            applicationDescription: 'App description',
            enableTypeScript: true,
            viewName: 'view-test',
            ui5Version: '1.120.0'
        };
        const basePath = join('some/path');
        const testOutputPath = join(basePath, 'webapp/test');
        fs = await generateFreestyleOPAFiles(basePath, opaConfig, fs);

        const expectedFiles = [
            'integration/NavigationJourney.ts',
            'integration/opaTests.qunit.html',
            'integration/pages/AppPage.ts',
            'integration/pages/view-testPage.ts',
            'testsuite.qunit.ts',
            'unit/controller/view-testPage.controller.ts',
            'unit/unitTests.qunit.html',
            'unit/unitTests.qunit.ts'
        ];
        expectedFiles.map((file: string) => {
            expect(fs?.exists(join(testOutputPath, file))).toBe(true);
        });

        // check unit/unitTests.qunit.ts
        const unitTestQUnit = fs?.read(join(testOutputPath, 'unit/unitTests.qunit.ts'));
        expect(removeSpaces(unitTestQUnit)).toBe(
            removeSpaces(`
            /* @sapUiRequire */
            QUnit.config.autostart = false;

            // import all your QUnit tests here
            void Promise.all([
                import("sap/ui/core/Core"), // Required to wait until Core has booted to start the QUnit tests
                import("unit/controller/view-testPage.controller")
            ]).then(([{ default: Core }]) => Core.ready()).then(() => {
                QUnit.start();
            });`)
        );

        // check unit/unitTests.qunit.html
        const unitTestHTML = fs?.read(join(testOutputPath, 'unit/unitTests.qunit.html'));
        expect(removeSpaces(unitTestHTML)).toBe(
            removeSpaces(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Unit tests for test-app-typescript</title>
                <script
                        id="sap-ui-bootstrap"
                        src="../../resources/sap-ui-core.js"
                        data-sap-ui-resource-roots='{
                                "test-app-typescript": "../../",
                                "unit": "."
                        }'
                        data-sap-ui-async="true"
                        data-sap-ui-compat-version="edge">
                </script>
                <link rel="stylesheet" type="text/css" href="../../resources/sap/ui/thirdparty/qunit-2.css">
                <script src="../../resources/sap/ui/thirdparty/qunit-2.js"></script>
                <script src="../../resources/sap/ui/qunit/qunit-junit.js"></script>
                <script src="../../resources/sap/ui/qunit/qunit-coverage.js"></script>
                <script src="../../resources/sap/ui/thirdparty/sinon.js"></script>
                <script src="../../resources/sap/ui/thirdparty/sinon-qunit.js"></script>
            <script src="unitTests.qunit.js"></script>
            </head>
            <body>
                <div id="qunit"></div>
                <div id="qunit-fixture"></div>
            </body>
            </html>`)
        );

        // check integration/opaTests.qunit.ts
        const opaTests = fs?.read(join(testOutputPath, 'integration/opaTests.qunit.ts'));
        expect(removeSpaces(opaTests)).toBe(
            removeSpaces(`
             /* global QUnit */
            sap.ui.require(["integration/NavigationJourney"
            ], function () {
                QUnit.config.autostart = false;
                QUnit.start();
            });`)
        );

        // check integration/opaTests.qunit.html
        const opaTestsHTML = fs?.read(join(testOutputPath, 'integration/opaTests.qunit.html'));
        expect(removeSpaces(opaTestsHTML)).toBe(
            removeSpaces(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8" />
                <title>Integration tests for Basic Template</title>

                <script
                        id="sap-ui-bootstrap"
                        src="../../resources/sap-ui-core.js"
                        data-sap-ui-theme=""
                        data-sap-ui-resource-roots='{
                                "test-app-typescript": "../../",
                                "integration": "./"
                        }'
                        data-sap-ui-animation-mode="none"
                        data-sap-ui-compat-version="edge"
                        data-sap-ui-async="true"
                        data-sap-ui-preload="async"
                        >
                </script>
                <link rel="stylesheet" type="text/css" href="../../resources/sap/ui/thirdparty/qunit-2.css">
                <script src="../../resources/sap/ui/thirdparty/qunit-2.js"></script>
                <script src="../../resources/sap/ui/qunit/qunit-junit.js"></script>
            <script src="opaTests.qunit.js"></script></head>
            <body>
                <div id="qunit"></div>
                <div id="qunit-fixture"></div>
            </body>
            </html>
        `)
        );
    });

    test('Generate OPA test files correctly when typescript is not enabled when version is > 1.120.0', async () => {
        const projectName = 'test_ff_1.120';
        const opaConfig = {
            appId: projectName,
            applicationTitle: 'App test',
            applicationDescription: 'App description',
            viewName: 'View1',
            ui5Version: '1.120.0'
        };

        fs = await generateFreestyleOPAFiles(testOutputDir, opaConfig, fs);
        const commitAsync = promisify(fs.commit.bind(fs));
        await commitAsync();

        const testOutPutPath = join(testOutputDir, 'webapp', 'test');
        const expectedTestOutputPath = join(expectedOutputPath, 'freestyle', projectName, 'webapp', 'test');
        expect(testOutPutPath).toMatchFolder(expectedTestOutputPath);
    });
});

describe('writeOPATsconfigJsonUpdates', () => {
    let fs: Editor;
    let log: Logger;

    const opaConfig = {
        appId: 'test-app-typescript',
        applicationTitle: 'App test',
        applicationDescription: 'App description',
        enableTypeScript: true,
        viewName: 'view-test',
        ui5Version: '1.71.0'
    };
    beforeEach(() => {
        fs = {
            readJSON: jest.fn(),
            writeJSON: jest.fn(),
            copyTpl: jest.fn()
        } as unknown as Editor;

        log = {
            error: jest.fn()
        } as unknown as Logger;
    });

    test('should log an error when writing to tsconfig.json fails', async () => {
        const mockError = new Error('Write error');

        (fs.writeJSON as jest.Mock).mockImplementation(() => {
            throw mockError;
        });
        const basePath = join('some/path');
        fs = await generateFreestyleOPAFiles(basePath, opaConfig, fs, log);

        expect(log.error).toHaveBeenCalled();
        expect(log.error).toHaveBeenCalledWith(
            t('error.errorWritingTsConfig', {
                error: mockError
            })
        );
    });

    test('should log an error when copying templates', async () => {
        const mockError = new Error('copy template error');

        (fs.copyTpl as jest.Mock).mockImplementation(() => {
            throw mockError;
        });

        const basePath = join('some/path');
        fs = await generateFreestyleOPAFiles(basePath, opaConfig, fs, log);

        expect(log.error).toHaveBeenCalled();
        expect(log.error).toHaveBeenCalledWith(
            t('error.errorCopyingFreestyleTestTemplates', {
                error: mockError
            })
        );
    });
});
