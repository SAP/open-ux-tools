import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { join } from 'path';
import type { CustomFilter } from '../../src/filter/types';
import { generateCustomFilter } from '../../src/filter';
import type { EventHandlerConfiguration, FileContentPosition } from '../../src/common/types';
import { Placement } from '../../src/common/types';
import { getEndOfLinesLength } from '../common';

describe('CustomFilter', () => {
    describe('generateCustomFilter', () => {
        const testDir = '' + Date.now();
        let fs: Editor;
        const filter: CustomFilter = {
            name: 'NewCustomFilter',
            label: 'Test Custom Filter',
            controlID: 'testID',
            property: 'Testing'
        };
        const getControllerPath = (controller: CustomFilter, isTs = false): string => {
            return join(testDir, `webapp/${controller.folder}/${controller.name}.${isTs ? 'ts' : 'js'}`);
        };
        const getExpectedFragmentPath = (newFilter: CustomFilter): string =>
            join(testDir, `webapp/${newFilter.folder}/${newFilter.fragmentFile}.fragment.xml`);

        const getManifest = (_: unknown = undefined): string => {
            const manifest = {
                'sap.app': {
                    id: 'myTestApp'
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
        test('New custom filter (no eventhandler)', () => {
            generateCustomFilter(testDir, filter, fs);
            expect(fs.readJSON(join(testDir, 'webapp/manifest.json'))).toMatchSnapshot();
            expect(fs.exists(getControllerPath(filter))).toBe(false);
            expect(fs.read(getExpectedFragmentPath(filter))).toMatchSnapshot();
        });

        test('Create several new custom filters', () => {
            const secondFilter = {
                name: 'NewCustomFilter2',
                label: 'Test Custom Filter 2',
                controlID: 'testID2',
                property: 'Testing'
            };
            generateCustomFilter(testDir, filter, fs);

            generateCustomFilter(testDir, secondFilter, fs);
            expect(fs.readJSON(join(testDir, 'webapp/manifest.json'))).toMatchSnapshot();
            expect(fs.exists(getControllerPath(secondFilter))).toBe(false);
            expect(fs.read(getExpectedFragmentPath(secondFilter))).toMatchSnapshot();
        });

        test('with new event handler as string', () => {
            generateCustomFilter(
                testDir,
                {
                    ...filter,
                    eventHandler: 'my.test.App.ext.ExistingHandler.onCustomAction'
                },
                fs
            );
            expect(fs.readJSON(join(testDir, 'webapp/manifest.json'))).toMatchSnapshot();
            expect(fs.read(getExpectedFragmentPath(filter))).toMatchSnapshot();
        });

        test('with existing event handler as string', () => {
            const controllerPath = 'my.test.App.ext.ExistingHandler.onTestFilter';
            fs.write(controllerPath, 'dummyContent');
            generateCustomFilter(
                testDir,
                {
                    ...filter,
                    eventHandler: controllerPath
                },
                fs
            );
            expect(fs.readJSON(join(testDir, 'webapp/manifest.json'))).toMatchSnapshot();
            expect(fs.read(getExpectedFragmentPath(filter))).toMatchSnapshot();
            expect(fs.read(controllerPath)).toEqual('dummyContent');
        });

        test('specific target folder, event handler as boolean', () => {
            generateCustomFilter(
                testDir,
                {
                    ...filter,
                    eventHandler: true
                },
                fs
            );
            expect(fs.readJSON(join(testDir, 'webapp/manifest.json'))).toMatchSnapshot();
            expect(fs.read(getExpectedFragmentPath(filter))).toMatchSnapshot();
            expect(fs.read(getControllerPath(filter))).toMatchSnapshot();
        });

        describe('Test property "eventHandler"', () => {
            const generateCustomFilterWithEventHandler = (
                filterId: string,
                eventHandler: string | EventHandlerConfiguration,
                folder?: string
            ) => {
                generateCustomFilter(
                    testDir,
                    {
                        ...filter,
                        folder,
                        eventHandler
                    },
                    fs
                );
            };

            test('"eventHandler" is empty "object" - create new file with default function name', () => {
                generateCustomFilterWithEventHandler(filter.name, {});

                expect(
                    fs.read(join(testDir, 'webapp', 'ext', 'newCustomFilter', 'NewCustomFilter.js'))
                ).toMatchSnapshot();
            });

            test('"eventHandler" is "object" - create new file with custom file and function names', () => {
                const extension = {
                    fnName: 'DummyFilterItems',
                    fileName: 'dummyFilter'
                };
                const folder = join('ext', 'custom');
                generateCustomFilterWithEventHandler(filter.name, extension, folder);

                expect(fs.read(join(testDir, 'webapp', 'ext', 'custom', `${extension.fileName}.js`))).toMatchSnapshot();
                expect(fs.read(getExpectedFragmentPath({ ...filter, folder: folder }))).toMatchSnapshot();
            });

            test('"eventHandler" is "object" - create new file with custom function name', () => {
                generateCustomFilterWithEventHandler(filter.name, {
                    fnName: 'DummyOnAction'
                });

                expect(
                    fs.read(join(testDir, 'webapp', 'ext', 'newCustomFilter', 'NewCustomFilter.js'))
                ).toMatchSnapshot();
            });

            test('"eventHandler" is "object", action with lowercase first letter', () => {
                generateCustomFilterWithEventHandler(filter.name, {
                    fnName: 'dummyOnAction'
                });

                expect(
                    fs.read(join(testDir, 'webapp', 'ext', 'newCustomFilter', 'NewCustomFilter.js'))
                ).toMatchSnapshot();
            });

            test(`"eventHandler" is String - no changes to handler file`, () => {
                generateCustomFilterWithEventHandler(filter.name, 'my.test.App.ext.ExistingHandler.onCustomAction');

                expect(fs.exists(join(testDir, 'webapp', 'ext', 'newCustomFilter', 'NewCustomFilter.js'))).toBeFalsy();
            });

            // Test with both position interfaces
            test.each([
                [
                    'position as object',
                    {
                        line: 18,
                        character: 9
                    },
                    undefined
                ],
                ['absolute position', 870, 18]
            ])(
                '"eventHandler" is object. Append new function to existing js file with %s',
                (_desc: string, position: number | FileContentPosition, appendLines?: number) => {
                    const fileName = 'MyExistingFilter';
                    // Create existing file with existing filters
                    const folder = join('ext', 'fragments');
                    const existingPath = join(testDir, 'webapp', folder, `${fileName}.js`);
                    // Generate handler with single method - content should be updated during generating of custom filter
                    fs.copyTpl(join(__dirname, '../../templates', 'filter/Controller.js'), existingPath, {
                        ...filter,
                        eventHandlerFnName: 'filterItems'
                    });
                    if (typeof position === 'number' && appendLines !== undefined) {
                        const content = fs.read(existingPath);
                        position += getEndOfLinesLength(appendLines, content);
                    }
                    // Create third action - append existing js file
                    const filterName = 'CustomFilter2';
                    const fnName = 'onHandleSecondAction';
                    generateCustomFilterWithEventHandler(
                        filterName,
                        {
                            fnName,
                            fileName,
                            insertScript: {
                                fragment: `,\n\t\tfilterItems2: function(sValue) {
			switch (sValue) {
				case "0":
						return new Filter({ path: "FlightPrice", operator: FilterOperator.LT, value1: 100 });
				case "1":
						return new Filter({
						filters: [
							new Filter({ path: "FlightPrice", operator: FilterOperator.GT, value1: 100 }),
							new Filter({ path: "FlightPrice", operator: FilterOperator.LT, value1: 500 })
						],
						and: true
					});
				case "2":
						return new Filter({ path: "FlightPrice", operator: FilterOperator.GT, value1: 500 });
			}
		}`,
                                position
                            }
                        },
                        folder
                    );

                    // Check update js file content
                    expect(fs.read(existingPath)).toMatchSnapshot();
                }
            );
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
            test(`Test 'position' property. ${testCase.name}`, () => {
                generateCustomFilter(
                    testDir,
                    {
                        ...filter,
                        position: testCase.position
                    },
                    fs
                );
                expect(fs.readJSON(join(testDir, 'webapp/manifest.json'))).toMatchSnapshot();
            });
        });

        const languages = [
            {
                name: 'TypeScript',
                typescript: true
            },
            {
                name: 'JavaScript',
                typescript: false
            }
        ];
        languages.forEach((languageConfig) => {
            test(`Test 'typescript' property. ${languageConfig.name}`, () => {
                generateCustomFilter(
                    testDir,
                    {
                        ...filter,
                        eventHandler: {},
                        typescript: languageConfig.typescript
                    },
                    fs
                );
                expect(fs.exists(getControllerPath(filter, languageConfig.typescript))).toBeTruthy();
                expect(fs.read(getControllerPath(filter, languageConfig.typescript))).toMatchSnapshot();
            });
        });

        test('Avoid overwrite for existing extension files', () => {
            const fileName = 'Existing';
            const target = join(testDir, 'different-folder');
            const folder = join('ext', 'different');
            // Copy manifest
            fs.write(join(target, 'webapp/manifest.json'), testAppManifest);
            // Prepare existing extension files
            const fragmentPath = join(target, `webapp/${folder}/${fileName}.fragment.xml`);
            fs.write(fragmentPath, 'fragmentContent');
            const handlerPath = join(target, `webapp/${folder}/${fileName}.js`);
            fs.write(handlerPath, 'handlerContent');
            generateCustomFilter(
                target,
                {
                    ...filter,
                    folder,
                    eventHandler: {
                        fileName
                    },
                    fragmentFile: fileName
                },
                fs
            );

            expect(fs.exists(handlerPath)).toBe(true);
            expect(fs.read(handlerPath)).toEqual('handlerContent');
            expect(fs.exists(fragmentPath)).toBe(true);
            expect(fs.read(fragmentPath)).toEqual('fragmentContent');
        });
    });
});
