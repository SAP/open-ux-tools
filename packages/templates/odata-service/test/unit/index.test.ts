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
                technicalName: 'TEST_ME'
            }
        } as OdataService;
        await generate(testDir, config, fs);

        const manifest = fs.readJSON(join(testDir, 'webapp', 'manifest.json')) as any;
        expect(manifest['sap.app'].dataSources.mainService.uri).toBe(config.path);
    });
});
