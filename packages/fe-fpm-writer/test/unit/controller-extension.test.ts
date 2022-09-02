import { create, Editor } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { join } from 'path';
import { generateControllerExtension } from '../../src';
import { ControllerExtension, ControllerExtensionPageType } from '../../src/controller-extension/types';
import {
    UI5_CONTROLLER_EXTENSION_LIST_REPORT,
    UI5_CONTROLLER_EXTENSION_OBJECT_PAGE
} from '../../src/controller-extension';

describe('ControllerExtension', () => {
    describe('generateControllerExtension', () => {
        const testDir = '' + Date.now();
        let fs: Editor;
        const controllerExtension: ControllerExtension = {
            name: 'NewExtension',
            folder: 'ext/controller',
            extension: {
                pageType: ControllerExtensionPageType.ListReport
            }
        };
        const getControllerPath = (controller: ControllerExtension, isTs = false): string => {
            return join(testDir, 'webapp', controller.folder!, `${controller.name}.controller.${isTs ? 'ts' : 'js'}`);
        };
        const expectedControllerPath = getControllerPath(controllerExtension);

        const getManifest = (extensions: unknown = undefined): string => {
            const manifest = {
                'sap.app': {
                    id: 'my.test.App'
                },
                'sap.ui5': {
                    dependencies: {
                        libs: {
                            'sap.fe.templates': {}
                        }
                    },
                    routing: {
                        targets: {
                            TestListReport: { name: 'sap.fe.templates.ListReport' },
                            TestObjectPage: { name: 'sap.fe.templates.ObjectPage' }
                        }
                    },
                    extends: {
                        extensions
                    }
                }
            };
            return JSON.stringify(manifest, null, 2);
        };
        const testAppManifest = getManifest();

        beforeEach(() => {
            fs = create(createStorage());
            fs.delete(testDir);
            fs.write(join(testDir, 'webapp/manifest.json'), testAppManifest);
        });

        const pageTypeTests = [
            ControllerExtensionPageType.ListReport,
            ControllerExtensionPageType.ObjectPage,
            undefined
        ];

        for (const pageType of pageTypeTests) {
            test(`New controller extension - ${pageType}`, () => {
                generateControllerExtension(
                    testDir,
                    {
                        ...controllerExtension,
                        extension: {
                            pageType
                        }
                    } as ControllerExtension,
                    fs
                );
                expect(fs.readJSON(join(testDir, 'webapp/manifest.json'))).toMatchSnapshot();
                expect(fs.exists(expectedControllerPath)).toBeTruthy();
                expect(fs.read(expectedControllerPath)).toMatchSnapshot();
            });
        }

        test('New controller extension with page id', () => {
            generateControllerExtension(
                testDir,
                {
                    ...controllerExtension,
                    extension: {
                        pageId: 'TestListReport',
                        pageType: ControllerExtensionPageType.ListReport
                    }
                },
                fs
            );
            expect(fs.readJSON(join(testDir, 'webapp/manifest.json'))).toMatchSnapshot();
            expect(fs.read(expectedControllerPath)).toMatchSnapshot();
        });

        test(`New controller extension with manual target`, () => {
            generateControllerExtension(
                testDir,
                {
                    ...controllerExtension,
                    extension: 'my.project.ext.view.Test'
                } as ControllerExtension,
                fs
            );
            expect(fs.readJSON(join(testDir, 'webapp/manifest.json'))).toMatchSnapshot();
            expect(fs.exists(expectedControllerPath)).toBeTruthy();
            expect(fs.read(expectedControllerPath)).toMatchSnapshot();
        });

        describe('Controller extension exists', () => {
            const getExtensions = (): any => {
                return {
                    'sap.ui.controllerExtensions': {
                        'sap.fe.templates.ListReport.ListReportController': {
                            controllerName: 'my.test.App.ext.controller.LRExtension'
                        },
                        'sap.fe.templates.ObjectPage.ObjectPageController': {
                            controllerNames: [
                                'my.test.App.ext.controller.OPExtension',
                                'my.test.App.ext.controller.OPExtension2'
                            ]
                        },
                        'sap.fe.templates.ObjectPage.ObjectPageController#project4::BookingObjectPage': {
                            controllerName: 'my.test.App.ext.controller.OPBookingExtension'
                        }
                    }
                };
            };

            const testCases = [
                // "controllerName" exists
                {
                    name: '"controllerName" exists - append new value',
                    controllerConfig: {
                        ...controllerExtension,
                        name: 'Dummy',
                        extension: {
                            pageType: ControllerExtensionPageType.ListReport
                        }
                    }
                },
                {
                    name: '"controllerName" exists - duplication',
                    controllerConfig: {
                        ...controllerExtension,
                        name: 'LRExtension',
                        extension: {
                            pageType: ControllerExtensionPageType.ListReport
                        }
                    }
                },
                {
                    name: '"controllerName" exists - overwrite',
                    controllerConfig: {
                        ...controllerExtension,
                        name: 'Dummy',
                        extension: {
                            pageType: ControllerExtensionPageType.ListReport
                        },
                        overwrite: true
                    }
                },
                // "controllerNames" exists
                {
                    name: '"controllerNames" exists - append new value',
                    controllerConfig: {
                        ...controllerExtension,
                        name: 'OPExtensionNew',
                        extension: {
                            pageType: ControllerExtensionPageType.ObjectPage
                        }
                    }
                },
                {
                    name: '"controllerNames" exists - duplication',
                    controllerConfig: {
                        ...controllerExtension,
                        name: 'OPExtension2',
                        extension: {
                            pageType: ControllerExtensionPageType.ObjectPage
                        }
                    }
                },
                {
                    name: '"controllerNames" exists - overwrite',
                    controllerConfig: {
                        ...controllerExtension,
                        name: 'Dummy',
                        extension: {
                            pageType: ControllerExtensionPageType.ObjectPage
                        },
                        overwrite: true
                    }
                }
            ];

            for (const testCase of testCases) {
                test(testCase.name, () => {
                    const manifestWithExtensions = getManifest(getExtensions());
                    fs = create(createStorage());
                    fs.delete(testDir);
                    fs.write(join(testDir, 'webapp/manifest.json'), manifestWithExtensions);
                    generateControllerExtension(testDir, testCase.controllerConfig, fs);
                    expect(fs.readJSON(join(testDir, 'webapp/manifest.json'))).toMatchSnapshot();
                    expect(fs.exists(getControllerPath(testCase.controllerConfig))).toBeTruthy();
                });
            }

            const mixStateTestCases = [
                {
                    name: '"controllerName" and "controllerNames" exists - append new value',
                    controllerConfig: {
                        ...controllerExtension,
                        name: 'LRExtension3',
                        extension: {
                            pageType: ControllerExtensionPageType.ListReport
                        }
                    }
                },
                {
                    name: '"controllerName" and "controllerNames" exists - duplicate',
                    controllerConfig: {
                        ...controllerExtension,
                        name: 'LRExtension2',
                        extension: {
                            pageType: ControllerExtensionPageType.ListReport
                        }
                    }
                }
            ];

            for (const testCase of mixStateTestCases) {
                test(testCase.name, () => {
                    const extension = getExtensions();
                    extension['sap.ui.controllerExtensions'][
                        'sap.fe.templates.ListReport.ListReportController'
                    ].controllerNames = ['my.test.App.ext.controller.LRExtension2'];
                    const manifestWithExtensions = getManifest(extension);
                    fs = create(createStorage());
                    fs.delete(testDir);
                    fs.write(join(testDir, 'webapp/manifest.json'), manifestWithExtensions);
                    generateControllerExtension(testDir, testCase.controllerConfig, fs);
                    expect(fs.readJSON(join(testDir, 'webapp/manifest.json'))).toMatchSnapshot();
                    expect(fs.exists(getControllerPath(testCase.controllerConfig))).toBeTruthy();
                });
            }
        });

        describe('Typescript controller', () => {
            // Page types
            const expectedTestControllerPath = getControllerPath(controllerExtension, true);
            for (const pageType of pageTypeTests) {
                test(`New controller extension - ${pageType}`, () => {
                    generateControllerExtension(
                        testDir,
                        {
                            ...controllerExtension,
                            extension: {
                                pageType
                            },
                            typescript: true
                        } as ControllerExtension,
                        fs
                    );
                    expect(fs.readJSON(join(testDir, 'webapp/manifest.json'))).toMatchSnapshot();
                    expect(fs.exists(expectedTestControllerPath)).toBeTruthy();
                    expect(fs.read(expectedTestControllerPath)).toMatchSnapshot();
                });
            }
            // Manual extension name
            const manualExtensionsTests = [
                UI5_CONTROLLER_EXTENSION_LIST_REPORT,
                UI5_CONTROLLER_EXTENSION_OBJECT_PAGE,
                `${UI5_CONTROLLER_EXTENSION_LIST_REPORT}#dummy.project::BookingSupplementObjectPage`,
                'my.project.ext.view.Test'
            ];

            for (const extension of manualExtensionsTests) {
                test(`New controller extension with manual target - ${extension}`, () => {
                    generateControllerExtension(
                        testDir,
                        {
                            ...controllerExtension,
                            extension,
                            typescript: true
                        } as ControllerExtension,
                        fs
                    );
                    expect(fs.readJSON(join(testDir, 'webapp/manifest.json'))).toMatchSnapshot();
                    expect(fs.exists(expectedTestControllerPath)).toBeTruthy();
                    expect(fs.read(expectedTestControllerPath)).toMatchSnapshot();
                });
            }
        });
    });
});
