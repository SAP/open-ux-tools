import { OdataService, OdataVersion } from '@sap/open-ux-tools-types';
import { generate } from '../src';
import { join } from 'path';
import { create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { removeSync } from 'fs-extra';

describe('ODataService templates', () => {
    const debug = !!process.env['UX_DEBUG'];

    const outputDir = join(__dirname, 'test-output');
    if (debug) console.log(outputDir);

    beforeAll(() => {
        removeSync(outputDir); // even for in memory
    });

    it('generates all expected files correctly', async () => {
        const testDir = join(outputDir, 'odata-service-v2');
        const fs = create(createStorage());
        fs.write(join(testDir, 'ui5.yaml'), '#empty file');
        fs.write(join(testDir, 'ui5-local.yaml'), '#empty file');
        fs.write(join(testDir, 'ui5-mock.yaml'), '#empty file');
        fs.writeJSON(join(testDir, 'package.json'), { ui5: { dependencies: [] } });
        fs.write(join(testDir, 'webapp', 'manifest.json'), '{}');

        const fsEditor = await generate(
            testDir,
            {
                url: 'http://localhost',
                path: '/sap/odata/testme',
                version: OdataVersion.v2,
                metadata: '<HELLO><WORLD><METADATA></METADATA></WORLD></HELLO>',
                annotations: {
                    technicalName: 'SEPM_XYZ',
                    xml: '<HELLO><ANNOTATION></ANNOTATION></WORLD></HELLO>'
                },
                appid: 'testappid'
            } as OdataService,
            fs
        );
        expect((fsEditor as any).dump(testDir)).toMatchSnapshot();
        if (debug) {
            fsEditor.commit(() => 0);
        }
    });
});
