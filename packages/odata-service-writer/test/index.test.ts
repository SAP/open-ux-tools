import type { OdataService } from '../src/types';
import { OdataVersion, ServiceType } from '../src/types';
import { generate } from '../src';
import { join } from 'path';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { readFile, removeSync } from 'fs-extra';
import { UI5Config } from '@sap-ux/ui5-config';

describe('ODataService templates', () => {
    const debug = !!process.env['UX_DEBUG'];
    const outputDir = join(__dirname, 'test-output');
    let fs: Editor = create(createStorage());

    const validServiceConfig: OdataService = {
        url: 'http://localhost',
        path: '/sap/odata/testme',
        type: ServiceType.EDMX,
        version: OdataVersion.v2,
        metadata: '<HELLO><WORLD><METADATA></METADATA></WORLD></HELLO>',
        annotations: {
            technicalName: '/SEPM_XYZ/SERVICE',
            xml: '<HELLO><ANNOTATION></ANNOTATION></WORLD></HELLO>'
        }
    };

    beforeAll(() => {
        if (debug) {
            removeSync(outputDir);
        } else {
            fs.delete(outputDir);
        }
    });

    afterAll(() => {
        if (debug) {
            fs.commit(() => 0);
        }
    });

    beforeEach(() => {
        fs = create(createStorage());
    });

    /**
     * Helper function to create app directories for testing in mem-fs.
     *
     * @param name testDir name
     * @returns testDir Path
     */
    async function createTestDir(name: string): Promise<string> {
        const testDir = join(outputDir, name);
        const ui5Yaml = (await UI5Config.newInstance('')).addFioriToolsProxydMiddleware({ ui5: {} }).toString();
        fs.write(join(testDir, 'ui5.yaml'), ui5Yaml);
        fs.write(join(testDir, 'ui5-local.yaml'), '');
        fs.writeJSON(join(testDir, 'package.json'), {});
        fs.write(
            join(testDir, 'webapp/manifest.json'),
            JSON.stringify({
                'sap.app': {
                    id: 'testappid'
                }
            })
        );
        return testDir;
    }

    it('generate: valid project with standard valid input', async () => {
        const testDir = await createTestDir('odata-service-v2');
        await generate(testDir, validServiceConfig as OdataService, fs);
        expect(fs.dump(testDir)).toMatchSnapshot();
        const packagePath = join(testDir, 'package.json');
        expect(fs.readJSON(packagePath)).toEqual({
            ui5: {
                dependencies: ['@sap-ux/ui5-middleware-fe-mockserver', '@sap/ux-ui5-tooling']
            },
            devDependencies: {
                '@sap-ux/ui5-middleware-fe-mockserver': '2',
                '@sap/ux-ui5-tooling': '1'
            },
            scripts: { 'start-mock': 'fiori run --config ./ui5-mock.yaml --open "/"' }
        });
    });

    it('generate: project with local annotations', async () => {
        const serviceConfigWithAnnotations: OdataService = {
            ...validServiceConfig,
            version: OdataVersion.v4,
            metadata: await readFile(join(__dirname, 'test-data', 'sepmra_prod_man_v2', `metadata.xml`), 'utf-8'),
            annotations: {
                technicalName: 'sepmra_annotations_tech_name',
                xml: await readFile(join(__dirname, 'test-data', 'sepmra_prod_man_v2', `annotations.xml`), 'utf-8')
            },
            localAnnotationsName: 'annotations_test'
        };

        const testDir = await createTestDir('local-annotations');
        await generate(testDir, serviceConfigWithAnnotations, fs);
        expect(fs.dump(testDir)).toMatchSnapshot();
    });

    it('Verify generated project of type CDS excludes dependencies in package.json', async () => {
        const config: OdataService = {
            url: 'http://localhost',
            path: '/sap/odata/testme',
            version: OdataVersion.v2,
            type: ServiceType.CDS
        };
        const testDir = await createTestDir('cds-service');
        await generate(testDir, config, fs);
        const packagePath = join(testDir, 'package.json');
        expect(fs.readJSON(packagePath)).toEqual({});
    });

    it('Verify generated project of type CDS updates CDS annotation files', async () => {
        const config: OdataService = {
            url: 'http://localhost',
            path: '/sap/odata/testme',
            version: OdataVersion.v2,
            type: ServiceType.CDS,
            annotations: {
                cdsFileContents: '"using AdminService as service from \'../../srv/admin-service\';"',
                projectPath: 'testProject',
                appPath: 'webapp',
                projectName: 'annotations'
            }
        };
        const testDir = await createTestDir('cds-service');
        await generate(testDir, config, fs);
        const annotationCdsPath = join('testProject', 'webapp', 'annotations', 'annotations.cds');
        expect(fs.read(annotationCdsPath)).toBe('"using AdminService as service from \'../../srv/admin-service\';"');
    });
});
