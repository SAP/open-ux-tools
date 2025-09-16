const { initUi5MappingStrategy } = require('../../src/utils/ui5MappingStrategy');
const path = require('path');

describe('Ui5 Mapping Strategy', () => {
    it('should map the files from the project to the file system', async () => {
        const { pathMappingFn, ui5VersionInfo } = await initUi5MappingStrategy({
            configPath: 'test/fixtures/ui5.yaml'
        });

        expect(pathMappingFn).not.toBe(null);
        ui5VersionInfo.libraries[0].version = '0.0.0'; // needed other this fail on bump :)
        expect(ui5VersionInfo).toMatchSnapshot();
        expect(path.relative(__dirname, pathMappingFn('sap/ui/demo/todo/Component'))).toBe(
            path.relative(__dirname, path.resolve(__dirname, '../fixtures/webapp/Component.js'))
        );
        expect(pathMappingFn('sap/ui/core/Component').split('@openui5')[1]).toBe(
            path.join('/sap.ui.core/1.130.0/src/sap/ui/core/Component.js')
        );

        const { pathMappingFn: secondPathMapping, ui5VersionInfo: secondUi5Version } = await initUi5MappingStrategy({
            configPath: 'test/fixtures/ui5.yaml'
        });
        expect(secondPathMapping).toStrictEqual(pathMappingFn); // No need to recreate the pathMappingFn
        expect(ui5VersionInfo).toStrictEqual(secondUi5Version); // No need to recreate the ui5Version
    }, 120_000);

    it('should map the files from a module to the file system', async () => {
        const { pathMappingFn, ui5VersionInfo } = await initUi5MappingStrategy({
            configPath: 'test/fixtures/ui5-module.yaml'
        });

        expect(pathMappingFn).not.toBe(null);
        ui5VersionInfo.libraries[0].version = '0.0.0'; // needed other this fail on bump :)
        expect(ui5VersionInfo).toMatchSnapshot();
        expect(path.relative(__dirname, pathMappingFn('sap/ui/demo/todo/Component'))).toBe(
            path.relative(__dirname, path.resolve(__dirname, '../fixtures/webapp/Component.js'))
        );
        expect(pathMappingFn('sap/ui/core/Component').split('@openui5')[1]).toBe(
            path.join('/sap.ui.core/1.130.0/src/sap/ui/core/Component.js')
        );
        const { pathMappingFn: secondPathMapping, ui5VersionInfo: secondUi5Version } = await initUi5MappingStrategy({
            configPath: 'test/fixtures/ui5-module.yaml'
        });
        expect(secondPathMapping).toStrictEqual(pathMappingFn); // No need to recreate the pathMappingFn
        expect(ui5VersionInfo).toStrictEqual(secondUi5Version); // No need to recreate the ui5Version
    }, 120_000);

    it('should map the files from a library to the file system', async () => {
        const { pathMappingFn, ui5VersionInfo } = await initUi5MappingStrategy({
            configPath: 'test/fixtures/ui5-lib.yaml'
        });

        expect(pathMappingFn).not.toBe(null);
        ui5VersionInfo.libraries[0].version = '0.0.0'; // needed other this fail on bump :)
        expect(ui5VersionInfo).toMatchSnapshot();
        expect(path.relative(__dirname, pathMappingFn('sap/ui/demo/todo/Component'))).toBe(
            path.relative(__dirname, path.resolve(__dirname, '../fixtures/webapp/Component.js'))
        );

        const { pathMappingFn: secondPathMapping, ui5VersionInfo: secondUi5Version } = await initUi5MappingStrategy({
            configPath: 'test/fixtures/ui5.yaml'
        });
        expect(secondPathMapping).toStrictEqual(pathMappingFn); // No need to recreate the pathMappingFn
        expect(ui5VersionInfo).toStrictEqual(secondUi5Version); // No need to recreate the ui5Version
    }, 120_000);
});
