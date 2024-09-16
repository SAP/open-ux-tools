import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { join } from 'path';
import { generateControllerExtension } from '../../src';
import type { ControllerExtension } from '../../src/controller-extension/types';
import { ControllerExtensionPageType } from '../../src/controller-extension/types';
import {
    UI5_CONTROLLER_EXTENSION_LIST_REPORT,
    UI5_CONTROLLER_EXTENSION_OBJECT_PAGE
} from '../../src/controller-extension';
import { detectTabSpacing } from '../../src/common/file';
import { tabSizingTestCases } from '../common';

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
            return join(testDir, `webapp/${controller.folder}/${controller.name}.controller.${isTs ? 'ts' : 'js'}`);
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
                    'extends': {
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

        test.each(pageTypeTests)('New controller extension - %s', async (pageType) => {
            await generateControllerExtension(
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

        test('New controller extension with page id', async () => {
            await generateControllerExtension(
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

        test(`New controller extension with manual target`, async () => {
            await generateControllerExtension(
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

            test.each(testCases)('$name', async ({ controllerConfig }) => {
                const manifestWithExtensions = getManifest(getExtensions());
                fs = create(createStorage());
                fs.delete(testDir);
                fs.write(join(testDir, 'webapp/manifest.json'), manifestWithExtensions);
                await generateControllerExtension(testDir, controllerConfig, fs);
                expect(fs.readJSON(join(testDir, 'webapp/manifest.json'))).toMatchSnapshot();
                expect(fs.exists(getControllerPath(controllerConfig))).toBeTruthy();
            });

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

            test.each(mixStateTestCases)('$name', async ({ controllerConfig }) => {
                const extension = getExtensions();
                extension['sap.ui.controllerExtensions'][
                    'sap.fe.templates.ListReport.ListReportController'
                ].controllerNames = ['my.test.App.ext.controller.LRExtension2'];
                const manifestWithExtensions = getManifest(extension);
                fs = create(createStorage());
                fs.delete(testDir);
                fs.write(join(testDir, 'webapp/manifest.json'), manifestWithExtensions);
                await generateControllerExtension(testDir, controllerConfig, fs);
                expect(fs.readJSON(join(testDir, 'webapp/manifest.json'))).toMatchSnapshot();
                expect(fs.exists(getControllerPath(controllerConfig))).toBeTruthy();
            });
        });

        describe('Typescript controller', () => {
            // Page types
            const expectedTestControllerPath = getControllerPath(controllerExtension, true);
            const expectedDeclarationFilePath = join(
                testDir,
                `webapp/${controllerExtension.folder}/ControllerExtension.d.ts`
            );
            const isCopyCalledWithOrigin = (
                copySpy: jest.SpyInstance,
                callIndex: number,
                fileName: string
            ): boolean => {
                const copyOrigin = copySpy.mock.calls[callIndex][0] as string;
                return copyOrigin === join(__dirname, '..', '..', 'templates', 'controller-extension', fileName);
            };
            const isCopyCalledWithTarget = (copySpy: jest.SpyInstance, callIndex: number, target: string): boolean => {
                const copyTarget = copySpy.mock.calls[callIndex][1] as string;
                return copyTarget === target;
            };
            test.each(pageTypeTests)('New controller extension - %s', async (pageType) => {
                await generateControllerExtension(
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
                expect(fs.exists(expectedDeclarationFilePath)).toBeTruthy();
                expect(fs.read(expectedTestControllerPath)).toMatchSnapshot();
            });
            // Manual extension name
            const manualExtensionsTests = [
                UI5_CONTROLLER_EXTENSION_LIST_REPORT,
                UI5_CONTROLLER_EXTENSION_OBJECT_PAGE,
                `${UI5_CONTROLLER_EXTENSION_LIST_REPORT}#dummy.project::BookingSupplementObjectPage`,
                'my.project.ext.view.Test'
            ];

            test.each(manualExtensionsTests)('New controller extension with manual target - %s', async (extension) => {
                await generateControllerExtension(
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

            test('Check "ControllerExtension.d.ts" file', async () => {
                expect(fs.exists(expectedDeclarationFilePath)).toBeFalsy();
                // Spy for copy method to detect how often it is called
                const copySpy = jest.spyOn(fs, 'copy');
                // Create extension controller
                await generateControllerExtension(
                    testDir,
                    {
                        ...controllerExtension,
                        extension: {
                            pageType: ControllerExtensionPageType.ListReport
                        },
                        typescript: true
                    } as ControllerExtension,
                    fs
                );
                // Check if new manifest entry created
                let manifest = JSON.parse(fs.read(join(testDir, 'webapp/manifest.json')));
                expect(manifest?.['sap.ui5']?.['extends']?.['extensions']).toEqual({
                    'sap.ui.controllerExtensions': {
                        'sap.fe.templates.ListReport.ListReportController': {
                            'controllerName': 'my.test.App.ext.controller.NewExtension'
                        }
                    }
                });
                // Check if declaration file was created
                expect(fs.exists(expectedDeclarationFilePath)).toBeTruthy();
                expect(fs.read(expectedDeclarationFilePath)).toMatchSnapshot();
                // Check how fs.copy method called - copy for 'Controller.ts' and first create of 'ControllerExtension.d.ts'
                expect(copySpy).toBeCalledTimes(2);
                expect(isCopyCalledWithOrigin(copySpy, 0, 'Controller.ts')).toBeTruthy();
                expect(isCopyCalledWithTarget(copySpy, 0, expectedTestControllerPath)).toBeTruthy();
                expect(isCopyCalledWithOrigin(copySpy, 1, 'ControllerExtension.d.ts')).toBeTruthy();
                expect(isCopyCalledWithTarget(copySpy, 1, expectedDeclarationFilePath)).toBeTruthy();

                // Second creation of controller extension
                copySpy.mockReset();
                const secondExtension = {
                    ...controllerExtension,
                    name: 'SecondExtension',
                    extension: {
                        pageType: ControllerExtensionPageType.ListReport
                    },
                    typescript: true
                };
                await generateControllerExtension(testDir, secondExtension as ControllerExtension, fs);
                expect(fs.exists(expectedDeclarationFilePath)).toBeTruthy();
                // Check how fs.copy method called - copy for 'Controller.ts' only, 'ControllerExtension.d.ts' was created on very first creation
                expect(copySpy).toBeCalledTimes(1);
                expect(isCopyCalledWithOrigin(copySpy, 0, 'Controller.ts')).toBeTruthy();
                expect(isCopyCalledWithTarget(copySpy, 0, getControllerPath(secondExtension, true))).toBeTruthy();
                manifest = JSON.parse(fs.read(join(testDir, 'webapp/manifest.json')));
                expect(manifest?.['sap.ui5']?.['extends']?.['extensions']).toEqual({
                    'sap.ui.controllerExtensions': {
                        'sap.fe.templates.ListReport.ListReportController': {
                            'controllerNames': [
                                'my.test.App.ext.controller.NewExtension',
                                'my.test.App.ext.controller.SecondExtension'
                            ]
                        }
                    }
                });
            });
        });

        describe('Test property custom "tabSizing"', () => {
            test.each(tabSizingTestCases)('$name', async ({ tabInfo, expectedAfterSave }) => {
                await generateControllerExtension(
                    testDir,
                    {
                        ...controllerExtension,
                        tabInfo
                    },
                    fs
                );
                let updatedManifest = fs.read(join(testDir, 'webapp/manifest.json'));
                let result = detectTabSpacing(updatedManifest);
                expect(result).toEqual(expectedAfterSave);
                // Generate another controller extension and check if new tab sizing recalculated correctly without passing tab size info
                await generateControllerExtension(
                    testDir,
                    {
                        ...controllerExtension,
                        name: 'Second'
                    },
                    fs
                );
                updatedManifest = fs.read(join(testDir, 'webapp/manifest.json'));
                result = detectTabSpacing(updatedManifest);
                expect(result).toEqual(expectedAfterSave);
            });
        });
    });
});
