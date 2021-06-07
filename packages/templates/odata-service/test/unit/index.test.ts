import { generate, OdataService, OdataVersion } from '../../src'; 
import { join } from 'path';
import { create, Editor } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';

const testDir = 'virtual-temp';
const commonConfig: Partial<OdataService> = {
    url: 'http://localhost',
    path: '/sap/odata/testme',
    metadata: '<HELLO WORLD />',
};

describe('Test generate method with valid input', () => {
    let fs: Editor;
    beforeEach(() => {
        // generate required files 
        fs = create(createStorage());
        fs.write(join(testDir, 'ui5.yaml'), '#empty file');
        fs.writeJSON(join(testDir, 'package.json'), { ui5: { dependencies: []}});
        fs.write(join(testDir, 'webapp', 'manifest.json'), '{}');
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
        expect(manifest['sap.app'].dataSources[config.annotations.technicalName as string]).toBeDefined();
        // verify local copy of metadata
        expect(fs.read(join(testDir, 'webapp', 'localService', 'metadata.xml'))).toBe(config.metadata);
        expect(fs.read(join(testDir, 'webapp', 'localService', `${config.annotations.technicalName}.xml`))).toBe(config.annotations.xml);
    });

    it('Valid OData V4 service', async () => {
        const config = {
            ...commonConfig,
            version: OdataVersion.v4
        };
        await generate(testDir, config as OdataService, fs);
        
        // verify updated manifest.json
        const manifest = fs.readJSON(join(testDir, 'webapp', 'manifest.json')) as any;
        expect(manifest['sap.app'].dataSources.mainService.uri).toBe(config.path);
        // verify local copy of metadata
        expect(fs.read(join(testDir, 'webapp', 'localService', 'metadata.xml'))).toBe(config.metadata);
    });
});
