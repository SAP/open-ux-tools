import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { join } from 'path';
import { generateActionMenu } from '../../src';
import { TargetControl } from '../../src/action-menu/types';
import { Placement } from '../../src/common/types';
import { detectTabSpacing } from '../../src/common/file';
import { tabSizingTestCases } from '../common';

describe('CustomAction', () => {
    describe('generateActionMenu', () => {
        const testDir = '' + Date.now();
        let fs: Editor;

        const testAppManifest = JSON.stringify(
            {
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
                            TestObjectPage: { name: 'sap.fe.templates.ListReport' }
                        }
                    }
                }
            },
            null,
            2
        );

        // minimal config
        const name = 'MyCustomActionMenu';
        const target = {
            page: 'TestObjectPage',
            control: TargetControl.header
        };
        const settings = {
            text: 'My custom action menu text',
            actions: ['Action1', 'Action2']
        };

        beforeEach(() => {
            fs = create(createStorage());
            fs.delete(testDir);
            fs.write(join(testDir, 'webapp/manifest.json'), testAppManifest);
        });

        test('basic case', async () => {
            await generateActionMenu(testDir, { name, target, settings }, fs);
            expect(fs.readJSON(join(testDir, 'webapp/manifest.json'))).toMatchSnapshot();
        });

        test('specific control as target', async () => {
            await generateActionMenu(
                testDir,
                {
                    name,
                    target: {
                        page: target.page,
                        control: TargetControl.table,
                        qualifier: 'MyQualifier',
                        navProperty: 'TestItems'
                    },
                    settings
                },
                fs
            );
            expect(fs.readJSON(join(testDir, 'webapp/manifest.json'))).toMatchSnapshot();
        });

        test('custom section as target', async () => {
            await generateActionMenu(
                testDir,
                {
                    name,
                    target: {
                        page: target.page,
                        control: TargetControl.body,
                        customSectionKey: 'CustomSectionOne'
                    },
                    settings
                },
                fs
            );
            expect(fs.readJSON(join(testDir, 'webapp/manifest.json'))).toMatchSnapshot();
        });

        test('update position information for existing custom actions', async () => {
            const testAppManifest = JSON.stringify(
                {
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
                                TestObjectPage: {
                                    name: 'sap.fe.templates.ListReport',
                                    options: {
                                        settings: {
                                            content: {
                                                body: {
                                                    sections: {
                                                        CustomSectionOne: {
                                                            actions: {
                                                                AnnoAction: {},
                                                                Action1: {
                                                                    position: {
                                                                        placement: Placement.After,
                                                                        anchor: 'AnnoAction'
                                                                    }
                                                                },
                                                                Action2: {
                                                                    position: {
                                                                        placement: Placement.Before,
                                                                        anchor: 'Action1'
                                                                    }
                                                                },
                                                                Action3: {
                                                                    position: {
                                                                        placement: Placement.After,
                                                                        anchor: 'Action2'
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                null,
                2
            );
            fs.write(join(testDir, 'webapp/manifest.json'), testAppManifest);

            await generateActionMenu(
                testDir,
                {
                    name,
                    target: {
                        page: target.page,
                        control: TargetControl.body,
                        customSectionKey: 'CustomSectionOne',
                        positionUpdates: [
                            { key: 'Action3', position: { placement: Placement.After, anchor: 'AnnoAction' } },
                            { key: 'Action1', position: undefined },
                            { key: 'Action2', position: undefined }
                        ]
                    },
                    settings
                },
                fs
            );
            expect(fs.readJSON(join(testDir, 'webapp/manifest.json'))).toMatchSnapshot();
        });

        const positionTests = [
            {
                name: 'Create with anchor',
                position: {
                    placement: Placement.Before,
                    anchor: 'Dummy'
                }
            },
            {
                name: 'Create without anchor',
                position: {
                    placement: Placement.Before
                }
            },
            {
                name: 'Create without position',
                position: undefined
            }
        ];
        positionTests.forEach((testCase) => {
            test(`Test 'position' property. ${testCase.name}`, async () => {
                await generateActionMenu(
                    testDir,
                    {
                        name,
                        target,
                        settings: {
                            ...settings,
                            position: testCase.position
                        }
                    },
                    fs
                );
                expect(fs.readJSON(join(testDir, 'webapp/manifest.json'))).toMatchSnapshot();
            });
        });

        describe('Test property custom "tabSizing"', () => {
            test.each(tabSizingTestCases)('$name', async ({ tabInfo, expectedAfterSave }) => {
                await generateActionMenu(testDir, { name, target, settings, tabInfo }, fs);
                let updatedManifest = fs.read(join(testDir, 'webapp/manifest.json'));
                let result = detectTabSpacing(updatedManifest);
                expect(result).toEqual(expectedAfterSave);
                // Generate another action and check if new tab sizing recalculated correctly without passing tab size info
                await generateActionMenu(testDir, { name: 'Second', target, settings }, fs);
                updatedManifest = fs.read(join(testDir, 'webapp/manifest.json'));
                result = detectTabSpacing(updatedManifest);
                expect(result).toEqual(expectedAfterSave);
            });
        });
    });

    describe('appendActionsToActionMenu', () => {
        const testDir = '' + Date.now();
        let fs: Editor;

        // minimal config
        const name = 'MyCustomActionMenu';
        const target = {
            page: 'TestObjectPage',
            control: TargetControl.header,
            menuId: 'TestMenu'
        };
        const settings = {
            text: 'My custom action menu text',
            actions: ['Action1', 'Action2']
        };

        beforeEach(() => {
            fs = create(createStorage());
            fs.delete(testDir);
        });

        test('basic case', async () => {
            const testAppManifest = JSON.stringify(
                {
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
                                TestObjectPage: {
                                    name: 'sap.fe.templates.ObjectPage',
                                    options: {
                                        settings: {
                                            content: {
                                                header: {
                                                    actions: {
                                                        TestMenu: {
                                                            menu: ['DummyAction']
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                null,
                2
            );
            fs.write(join(testDir, 'webapp/manifest.json'), testAppManifest);
            await generateActionMenu(testDir, { name, target, settings }, fs);
            expect(fs.readJSON(join(testDir, 'webapp/manifest.json'))).toMatchSnapshot();
        });

        test('specific control as target', async () => {
            const testAppManifest = JSON.stringify(
                {
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
                                TestObjectPage: {
                                    name: 'sap.fe.templates.ObjectPage',
                                    options: {
                                        settings: {
                                            controlConfiguration: {
                                                ['TestItems/@com.sap.vocabularies.UI.v1.LineItem#MyQualifier']: {
                                                    actions: {
                                                        TestMenu: {
                                                            menu: ['DummyAction']
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                null,
                2
            );
            fs.write(join(testDir, 'webapp/manifest.json'), testAppManifest);

            await generateActionMenu(
                testDir,
                {
                    name,
                    target: {
                        page: target.page,
                        control: TargetControl.table,
                        qualifier: 'MyQualifier',
                        navProperty: 'TestItems',
                        menuId: 'TestMenu'
                    },
                    settings
                },
                fs
            );
            expect(fs.readJSON(join(testDir, 'webapp/manifest.json'))).toMatchSnapshot();
        });

        test('custom section as target', async () => {
            const testAppManifest = JSON.stringify(
                {
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
                                TestObjectPage: {
                                    name: 'sap.fe.templates.ObjectPage',
                                    options: {
                                        settings: {
                                            content: {
                                                body: {
                                                    sections: {
                                                        CustomSectionOne: {
                                                            actions: {
                                                                TestMenu: {
                                                                    menu: ['DummyAction']
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                null,
                2
            );
            fs.write(join(testDir, 'webapp/manifest.json'), testAppManifest);
            await generateActionMenu(
                testDir,
                {
                    name,
                    target: {
                        page: target.page,
                        control: TargetControl.body,
                        customSectionKey: 'CustomSectionOne',
                        menuId: 'TestMenu'
                    },
                    settings
                },
                fs
            );
            expect(fs.readJSON(join(testDir, 'webapp/manifest.json'))).toMatchSnapshot();
        });
    });
});
