import { generate, OdataService, OdataVersion } from '../../src';
import { join } from 'path';
import { create, Editor } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { enhanceData } from '../../src/data';
import cloneDeep from 'lodash/cloneDeep';

const testDir = 'virtual-temp';
const commonConfig = {
    url: 'http://localhost',
    path: '/sap/odata/testme',
    metadata: '<HELLO WORLD />'
};

describe('Test generate method with invalid location', () => {
    it('No package.json or ui5.yaml', async () => {
        try {
            await generate(testDir, commonConfig as OdataService);
            fail('An error should have been thrown');
        } catch (error) {
            expect(error).toBeDefined();
        }
    });
});

describe('Test generate method with valid input', () => {
    let fs: Editor;
    beforeEach(() => {
        // generate required files
        fs = create(createStorage());
        fs.write(join(testDir, 'ui5.yaml'), '#empty file');
        fs.write(join(testDir, 'ui5-local.yaml'), '#empty file');
        fs.write(join(testDir, 'ui5-mock.yaml'), '#empty file');
        fs.writeJSON(join(testDir, 'package.json'), { ui5: { dependencies: [] } });
        fs.write(
            join(testDir, 'webapp', 'manifest.json'),
            JSON.stringify({
                'sap.app': {
                    id: 'testappid'
                }
            })
        );
    });

    it('Valid OData V2 service', async () => {
        const config = {
            ...commonConfig,
            version: OdataVersion.v2,
            annotations: {
                technicalName: 'TEST_ME',
                xml: '<HELLO WORLD />'
            }
        };
        await generate(testDir, config as OdataService, fs);

        // verify updated manifest.json
        const manifest = fs.readJSON(join(testDir, 'webapp', 'manifest.json')) as any;
        expect(manifest['sap.app'].dataSources.mainService.uri).toBe(config.path);
        expect(manifest['sap.app'].dataSources[config.annotations.technicalName]).toBeDefined();
        // verify local copy of metadata
        expect(fs.read(join(testDir, 'webapp', 'localService', 'metadata.xml'))).toBe(config.metadata);
        expect(fs.read(join(testDir, 'webapp', 'localService', `${config.annotations.technicalName}.xml`))).toBe(
            config.annotations.xml
        );
    });

    it('Valid OData V4 service', async () => {
        const config = {
            ...commonConfig,
            version: OdataVersion.v4,
            name: 'myService'
        };
        await generate(testDir, config as OdataService, fs);

        // verify updated manifest.json
        const manifest = fs.readJSON(join(testDir, 'webapp', 'manifest.json')) as any;
        expect(manifest['sap.app'].dataSources[config.name].uri).toBe(config.path);
        // verify local copy of metadata
        expect(fs.read(join(testDir, 'webapp', 'localService', 'metadata.xml'))).toBe(config.metadata);
        // verify that no destination is added to the ui5.yaml
        expect(fs.read(join(testDir, 'ui5.yaml'))).not.toContain('destination: ');
    });

    it('Valid OData service with destination and no optional parameters', async () => {
        const config = {
            url: commonConfig.url,
            path: commonConfig.path + '/',
            version: OdataVersion.v4,
            destination: {
                name: 'test'
            }
        };
        // no localService folder needed

        await generate(testDir, config as OdataService, fs);

        // verify updated manifest.json
        const manifest = fs.readJSON(join(testDir, 'webapp', 'manifest.json')) as any;
        expect(manifest['sap.app'].dataSources.mainService.uri).toBe(config.path);
        // verify that the destination is added to the ui5.yaml
        expect(fs.read(join(testDir, 'ui5.yaml'))).toContain(`destination: ${config.destination.name}`);
        // verify that no localService folder has been created
        expect(fs.exists(join(testDir, 'webapp', 'localService', 'metadata.xml'))).toBeFalsy();
    });

    it('Valid service with neither metadata nor annotations and not starting with /sap', async () => {
        const config = {
            url: 'https://services.odata.org',
            path: '/V2/Northwind/Northwind.svc',
            version: OdataVersion.v2
        };
        // no localService folder needed

        await generate(testDir, config as OdataService, fs);

        // verify updated manifest.json
        const manifest = fs.readJSON(join(testDir, 'webapp', 'manifest.json')) as any;
        expect(manifest['sap.app'].dataSources.mainService.settings.annotations).toStrictEqual([]);
        // verify that the path is correct in ui5.yaml
        expect(fs.read(join(testDir, 'ui5.yaml'))).toContain('- path: /V2');
    });

    it('Enhance unspecified input data with defaults', async () => {
        const config = {
            url: 'https://services.odata.org',
            path: '/V2/Northwind/Northwind.svc',
            version: OdataVersion.v2
        } as OdataService;

        let configCopy = cloneDeep(config);
        enhanceData(configCopy);
        expect(configCopy).toMatchInlineSnapshot(`
            Object {
              "model": "",
              "name": "mainService",
              "path": "/V2/Northwind/Northwind.svc/",
              "url": "https://services.odata.org",
              "version": "2",
            }
        `);

        configCopy = cloneDeep(Object.assign({}, config, { model: 'modelName', name: 'datasourceName' }));
        enhanceData(configCopy);
        expect(configCopy).toMatchInlineSnapshot(`
            Object {
              "model": "modelName",
              "name": "datasourceName",
              "path": "/V2/Northwind/Northwind.svc/",
              "url": "https://services.odata.org",
              "version": "2",
            }
        `);

        // Undefined path does not throw but sets valid path
        configCopy = cloneDeep(Object.assign({}, config, { path: undefined }));
        enhanceData(configCopy);
        expect(configCopy).toMatchInlineSnapshot(`
            Object {
              "model": "",
              "name": "mainService",
              "path": "/",
              "url": "https://services.odata.org",
              "version": "2",
            }
        `);
    });
});
