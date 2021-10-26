import { t } from '../src/i18n';
import { OdataService, OdataVersion } from '../src/types';
import { generate } from '../src';
import { join } from 'path';
import { create, Editor } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { removeSync } from 'fs-extra';
import { UI5Config } from '@sap-ux/ui5-config';

describe('ODataService templates', () => {
    const debug = !!process.env['UX_DEBUG'];
    const outputDir = join(__dirname, 'test-output');
    let fs: Editor = create(createStorage());

    const validServiceConfig: OdataService = {
        url: 'http://localhost',
        path: '/sap/odata/testme',
        version: OdataVersion.v2,
        metadata: '<HELLO><WORLD><METADATA></METADATA></WORLD></HELLO>',
        annotations: {
            technicalName: 'SEPM_XYZ',
            xml: '<HELLO><ANNOTATION></ANNOTATION></WORLD></HELLO>'
        }
    };

    beforeAll(() => {
        if (debug) {
            removeSync(outputDir);
            console.log(outputDir);
        } else {
            fs.delete(outputDir);
        }
    });

    afterAll(() => {
        if (debug) {
            fs.commit(() => 0);
        }
    });

    it('generate: invalide project with faulty manifest.json', async () => {
        const testDir = join(outputDir, 'invalid-project');

        const ui5Yaml = (await UI5Config.newInstance('')).addFioriToolsProxydMiddleware({ ui5: {} }).toString();
        fs.write(join(testDir, 'ui5.yaml'), ui5Yaml);
        fs.write(join(testDir, 'ui5-local.yaml'), '');
        fs.writeJSON(join(testDir, 'package.json'), { ui5: { dependencies: [] } });
        const manifestPath = join(testDir, 'webapp/manifest.json');
        fs.write(manifestPath, '{}');

        await expect(generate(testDir, validServiceConfig, fs)).rejects.toEqual(
            Error(t('error.requiredProjectPropertyNotFound', { property: `'sap.app'.id`, path: manifestPath }))
        );
    });

    it('generate: valid project with standard valid input', async () => {
        const testDir = join(outputDir, 'odata-service-v2');
        const ui5Yaml = (await UI5Config.newInstance('')).addFioriToolsProxydMiddleware({ ui5: {} }).toString();

        const fs = create(createStorage());
        fs.write(join(testDir, 'ui5.yaml'), ui5Yaml);
        fs.write(join(testDir, 'ui5-local.yaml'), '');
        fs.writeJSON(join(testDir, 'package.json'), { ui5: { dependencies: [] } });
        fs.write(
            join(testDir, 'webapp', 'manifest.json'),
            JSON.stringify({
                'sap.app': {
                    id: 'testappid'
                }
            })
        );

        const fsEditor = await generate(testDir, validServiceConfig as OdataService, fs);
        expect((fsEditor as any).dump(testDir)).toMatchSnapshot();
    });
});
