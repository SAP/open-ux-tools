const { initTsConfigMappingStrategy } = require('../../src/utils/tsMappingStrategy');
const path = require('path');

describe('Typescript Mapping Strategy', () => {
    it('should map the files from the project to the file system', async () => {
        const pathMappingFn = await initTsConfigMappingStrategy({
            rootFolder: path.resolve(__dirname, '../fixtures'),
            configPath: path.resolve(__dirname, '../fixtures/tsconfig.json')
        });
        expect(pathMappingFn).not.toBe(null);
        const fixturesPath = path.resolve(__dirname, '../fixtures/webapp');

        expect(path.relative(__dirname, pathMappingFn('sap/ui/demo/todo/Component'))).toBe(
            path.relative(__dirname, path.resolve(fixturesPath, 'Component.js'))
        );
        expect(path.relative(__dirname, pathMappingFn('sap/ui/demo/todo/Component.js'))).toBe(
            path.relative(__dirname, path.resolve(fixturesPath, 'Component.js'))
        );
        expect(path.relative(__dirname, pathMappingFn('sap/ui/demo/todo/OtherFile.ts'))).toBe(
            path.relative(__dirname, path.resolve(fixturesPath, 'OtherFile.ts'))
        );
        expect(path.relative(__dirname, pathMappingFn('sap/ui/demo/todo/OtherFile'))).toBe(
            path.relative(__dirname, path.resolve(fixturesPath, 'OtherFile.ts'))
        );
        expect(path.relative(__dirname, pathMappingFn('sap/ui/demo/todo/TSXFile.tsx'))).toBe(
            path.relative(__dirname, path.resolve(fixturesPath, 'TSXFile.tsx'))
        );
        expect(path.relative(__dirname, pathMappingFn('sap/ui/demo/todo/TSXFile'))).toBe(
            path.relative(__dirname, path.resolve(fixturesPath, 'TSXFile.tsx'))
        );
        expect(path.relative(__dirname, pathMappingFn('otherPackage/MyFile'))).toBe(
            path.relative(__dirname, path.resolve('otherPackage/MyFile'))
        ); // not really resolved

        const secondpathMapping = await initTsConfigMappingStrategy({
            rootFolder: path.resolve(__dirname, 'fixtures'),
            configPath: path.resolve(__dirname, 'fixtures/tsconfig.json')
        });
        expect(secondpathMapping).toStrictEqual(pathMappingFn); // No need to recreate the pathMappingFn
    }, 35000);
});
