import { join } from 'path';
import { type I18nEntry, getI18nPaths, updateI18nProperties } from '../../src/project/i18n';
import type { Manifest } from '../../src/types';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';

describe('getI18nPaths', () => {
    const manifestFolder = 'root';
    const defaultI18nAppPath = 'root/i18n/i18n.properties';
    const getExpectedPath = (relativeI18nPath: string, folder: string = manifestFolder) => {
        return join(folder, relativeI18nPath);
    };
    const getUI5I18n = (path: unknown): any => {
        return {
            'sap.ui5': {
                models: {
                    i18n: {
                        type: 'sap.ui.model.resource.ResourceModel',
                        uri: path
                    }
                }
            }
        };
    };
    test('sap.ui5/i18n - string', async () => {
        const i18nPath = 'dummy/i18n.properties';
        const manifestTemp = getUI5I18n(i18nPath);
        const result = getI18nPaths(manifestFolder, manifestTemp as Manifest);
        expect(result['sap.ui5']).toEqual(getExpectedPath(i18nPath));
    });

    const getSapAppI18n = (path: string): any => {
        return {
            'sap.app': {
                i18n: path
            }
        };
    };
    test('sap.app/i18n - string', async () => {
        const i18nPath = 'dummy/i18n.properties';
        const manifestTemp = getSapAppI18n(i18nPath);
        const result = getI18nPaths(manifestFolder, manifestTemp as Manifest);
        expect(result['sap.app']).toEqual(getExpectedPath(i18nPath));
        expect(result['sap.ui5']).toEqual(undefined);
    });
    test('sap.app/i18n - default location', async () => {
        const manifestTemp = {} as Manifest;
        const result = getI18nPaths(manifestFolder, manifestTemp);
        expect(result['sap.app']).toEqual(defaultI18nAppPath);
    });

    const getUI5I18nWithSettings = (path: unknown): any => {
        return {
            'sap.ui5': {
                models: {
                    i18n: {
                        type: 'sap.ui.model.resource.ResourceModel',
                        settings: {
                            bundleUrl: path
                        }
                    }
                }
            }
        };
    };
    test('sap.ui5/i18n/settings/bundleUrl - settings object', async () => {
        const i18nPath = 'dummy/i18n.properties';
        const manifestTemp = getUI5I18nWithSettings(i18nPath);
        const result = getI18nPaths(manifestFolder, manifestTemp as Manifest);
        expect(result['sap.ui5']).toEqual(getExpectedPath(i18nPath));
    });

    test('Safe checks - undefined "sapui5"', async () => {
        const manifestTemp = {} as Manifest;
        const result = getI18nPaths(manifestFolder, manifestTemp);
        expect(result['sap.app']).toEqual(defaultI18nAppPath);
        expect(result['sap.ui5']).toEqual(undefined);
    });

    test('Safe checks - no manifest', async () => {
        const result = getI18nPaths(manifestFolder, undefined as unknown as Manifest);
        expect(result['sap.app']).toEqual(defaultI18nAppPath);
        expect(result['sap.ui5']).toEqual(undefined);
    });

    test('Safe checks - sap.ui5/i18n is not string', async () => {
        const i18nPath = {};
        const manifestTemp = getUI5I18n(i18nPath);
        const result = getI18nPaths(manifestFolder, manifestTemp as Manifest);
        expect(result['sap.ui5']).toEqual(undefined);
    });

    test('Safe checks - sap.ui5/i18n/settings/bundleUrl is not string', async () => {
        const i18nPath = {};
        const manifestTemp = getUI5I18nWithSettings(i18nPath);
        const result = getI18nPaths(manifestFolder, manifestTemp as Manifest);
        expect(result['sap.ui5']).toEqual(undefined);
    });

    test('All variants in one manifest(sap.ui5/i18n, sap.ui5/i18n/settings/bundleUrl, sap.app/i18n)', async () => {
        const i18nPath = 'dummy/i18n.properties';
        const manifestTemp = getUI5I18n(i18nPath);

        const i18nPathForApp = 'app/i18n.properties';
        const manifestAppI18n = getSapAppI18n(i18nPathForApp) as any;
        manifestTemp['sap.app'] = manifestAppI18n['sap.app'];

        const manifestUI5I18nWithSettings = getUI5I18nWithSettings(i18nPathForApp);
        manifestTemp['sap.ui5'].models['i18n'].settings =
            manifestUI5I18nWithSettings['sap.ui5'].models['i18n'].settings;

        const result = getI18nPaths(manifestFolder, manifestTemp as Manifest);
        expect(result['sap.app']).toEqual(getExpectedPath(i18nPathForApp));
        expect(result['sap.ui5']).toEqual(getExpectedPath(i18nPath));
    });

    test('Second combination - sap.ui5/i18n/settings/bundleUrl and sap.app/i18n', async () => {
        const i18nPath = 'dummy/i18n.properties';
        const i18nPathApp = 'app/i18n.properties';
        const manifestTemp = getUI5I18nWithSettings(i18nPath);

        const manifestAppI18n = getSapAppI18n(i18nPathApp);
        manifestTemp['sap.app'] = manifestAppI18n['sap.app'];

        const result = getI18nPaths(manifestFolder, manifestTemp as Manifest);
        expect(result['sap.app']).toEqual(getExpectedPath(i18nPathApp));
        expect(result['sap.ui5']).toEqual(getExpectedPath(i18nPath));
    });

    test('sap.ui5/i18n/settings/bundleName', () => {
        const i18nPath = 'dummy/app';
        const manifest = {
            'sap.app': {
                id: 'app.with.name.space'
            },
            'sap.ui5': {
                models: {
                    i18n: {
                        settings: {
                            bundleName: 'app.with.name.space.i18n.i18n'
                        }
                    }
                }
            }
        };
        const result = getI18nPaths(i18nPath, manifest as unknown as Manifest);
        expect(result['sap.app']).toBe(join('dummy', 'app', 'i18n', 'i18n.properties'));
        expect(result['sap.ui5']).toBe(join('dummy', 'app', 'i18n', 'i18n.properties'));
    });
});

describe('updateI18nProperties', () => {
    const memFs = create(createStorage());
    const memFilePath = join(__dirname, 'i18n.properties');
    const memFileContent = '';
    memFs.writeJSON(memFilePath, memFileContent);

    it('should update properties correctly', async () => {
        // Arrange
        const mockProperties: I18nEntry[] = [
            {
                key: 'key1',
                value: 'value1',
                comment: 'comment1',
                lineIndex: 0
            }
        ];
        // Act
        await updateI18nProperties(memFilePath, mockProperties, memFs);

        // Assert
        expect(memFs.read(memFilePath)).toMatchInlineSnapshot(`
            "\\"\\"

            #comment1
            key1=value1
            "
        `);
    });
});
