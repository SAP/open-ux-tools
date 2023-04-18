import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { join } from 'path';
import { CustomFilter } from '../../src/filter/types';
import { generateCustomFilter } from '../../src/filter';
import { Placement } from '../../src/common/types';

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
            join(testDir, `webapp/${newFilter.folder}/${newFilter.name}.fragment.xml`);

        const getManifest = (extensions: unknown = undefined): string => {
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
        test('New custom filters (no eventhandler)', () => {
            generateCustomFilter(testDir, filter, fs);
            expect(fs.readJSON(join(testDir, 'webapp/manifest.json'))).toMatchSnapshot();
            expect(fs.exists(getControllerPath(filter))).toBeTruthy();
            expect(fs.read(getControllerPath(filter))).toMatchSnapshot();
            expect(fs.exists(getExpectedFragmentPath(filter))).toBeTruthy();
            expect(fs.read(getExpectedFragmentPath(filter))).toMatchSnapshot();
        });

        test('Create several new custom filters', () => {
            generateCustomFilter(testDir, filter, fs);

            const secondFilterConfig = { ...filter, name: 'NewCustomFilter2', template: undefined };
            generateCustomFilter(testDir, secondFilterConfig, fs);
            expect(fs.readJSON(join(testDir, 'webapp/manifest.json'))).toMatchSnapshot();
            expect(fs.exists(getControllerPath(secondFilterConfig))).toBeTruthy();
            expect(fs.read(getControllerPath(secondFilterConfig))).toMatchSnapshot();
            expect(fs.exists(getExpectedFragmentPath(secondFilterConfig))).toBeTruthy();
            expect(fs.read(getExpectedFragmentPath(secondFilterConfig))).toMatchSnapshot();
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
            expect(fs.exists(controllerPath)).toBe(true);
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
            expect(fs.read(getControllerPath(filter))).toMatchSnapshot();
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
                        typescript: languageConfig.typescript
                    },
                    fs
                );
                expect(fs.exists(getControllerPath(filter, languageConfig.typescript))).toBeTruthy();
                expect(fs.read(getControllerPath(filter, languageConfig.typescript))).toMatchSnapshot();
            });
        });
    });
});
