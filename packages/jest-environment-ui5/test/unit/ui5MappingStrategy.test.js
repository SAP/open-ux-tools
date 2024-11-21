const { initUi5MappingStrategy } = require('../../src/ui5MappingStrategy');
const path = require('path');

describe('Ui5 Mapping Strategy', () => {
    it('should map the files from the project to the file system', async () => {
        const pathMappingFn = await initUi5MappingStrategy({ configPath: 'test/fixtures/ui5.yaml' });

        expect(pathMappingFn).not.toBe(null);
        expect(path.relative(__dirname, pathMappingFn('sap/ui/demo/todo/Component'))).toBe(
            path.relative(__dirname, path.resolve(__dirname, '../fixtures/webapp/Component.js'))
        );
        expect(pathMappingFn('sap/ui/core/Component').split('@openui5')[1]).toBe(
            path.resolve('/sap.ui.core/1.130.0/src/sap/ui/core/Component.js')
        );

        const secondpathMapping = await initUi5MappingStrategy({ configPath: 'test/fixtures/ui5.yaml' });
        expect(secondpathMapping).toStrictEqual(pathMappingFn); // No need to recreate the pathMappingFn
    }, 10000);
});
