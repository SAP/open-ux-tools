import { OdataService, OdataVersion } from '../src/data/types';
import { generate } from '../src';
import { join } from 'path';
import { create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { rmdirSync } from 'fs';
import { tmpdir } from 'os';

describe('Fiori freestyle templates', () => {
    const debug = !!process.env['UX_DEBUG'];

    const outputDir = join(tmpdir(), '/templates/odata-service');
    if (debug) console.log(outputDir);

    afterEach(() => {
        if (!debug) rmdirSync(outputDir, { recursive: true });
    });

    it('generates all expected files correctly', async () => {
        const testDir = join(outputDir, 'v2');
        const fs = create(createStorage());
        fs.write(join(testDir, 'ui5.yaml'), '#empty file');
        fs.writeJSON(join(testDir, 'package.json'), { ui5: { dependencies: [] } });
        fs.write(join(testDir, 'webapp', 'manifest.json'), '{}');

        const fsEditor = await generate(
            testDir,
            {
                url: 'http://localhost',
                path: '/sap/odata/testme',
                version: OdataVersion.v2,
                metadata: '<HELLO WORLD />',
                annotations: {
                    technicalName: 'SEPM_XYZ'
                }
            } as OdataService,
            fs
        );
        if (debug) fsEditor.commit(() => 0);
        expect((fsEditor as any).dump(testDir)).toMatchSnapshot();
    });
});
