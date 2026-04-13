import { jest } from '@jest/globals';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as realFs from 'node:fs';
import * as memfs from 'memfs';
import { Union } from 'unionfs';

const __dirname = join(fileURLToPath(import.meta.url), '..');
const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');

// Create the union filesystem
const ufs = new Union();
ufs.use(realFs as any).use(memfs.vol as any);
(ufs as any).realpath = realFs.realpath;
(ufs as any).realpathSync = realFs.realpathSync;

jest.unstable_mockModule('node:fs', () => ufs);

const { MockMta } = await import('./mockMta');
jest.unstable_mockModule('@sap/mta-lib', () => ({
    Mta: MockMta
}));

const fs = await import('node:fs');
const { MtaConfig } = await import('../../src/');
const { FileName } = await import('@sap-ux/project-access');

describe('Adding and Updating mta extension configuration', () => {
    beforeEach(() => {
        memfs.vol.reset();
        // Source code at mta.ts:909 reads join(__dirname, '../../templates/app/mta-ext.mtaext')
        // where __dirname = <pkgRoot>/src (set by jest.setup.mjs). This resolves to
        // <pkgRoot>/../templates/app/mta-ext.mtaext (wrong path). Seed memfs with the
        // template at that wrong path so the unionfs overlay finds it.
        const wrongTemplatePath = join(pkgRoot, 'src', '..', '..', 'templates', 'app', 'mta-ext.mtaext');
        const realTemplatePath = join(pkgRoot, 'templates', 'app', 'mta-ext.mtaext');
        const templateContent = realFs.readFileSync(realTemplatePath, 'utf-8');
        memfs.vol.mkdirSync(dirname(wrongTemplatePath), { recursive: true });
        memfs.vol.writeFileSync(wrongTemplatePath, templateContent);
    });

    beforeAll(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        jest.resetAllMocks();
    });

    it('Creates mta extension in app folder', async () => {
        const testAppPath = '/test-app-mta-ext';
        const mtaYaml = fs.readFileSync(join(__dirname, 'fixtures/mta-ext/app/mta.yaml'), 'utf-8');
        memfs.vol.fromNestedJSON(
            {
                [`.${testAppPath}/mta.yaml`]: mtaYaml
            },
            '/'
        );
        const mtaConfig = await MtaConfig.newInstance(testAppPath);
        await mtaConfig.addMtaExtensionConfig('Instance_Dest_Name1', 'http://somehost:8080', {
            key: 'ApiKey',
            value: 'key_value_abcd1234'
        });
        expect(fs.readFileSync(`${testAppPath}/${FileName.MtaExtYaml}`, 'utf-8')).toMatchInlineSnapshot(`
            "## SAP UX Tools generated mtaext file
            _schema-version: \\"3.2\\"
            ID: test-mta-ext
            extends: test-mta
            version: 1.0.0

            resources:
            - name: test-mta-destination-service
              parameters:
                config:
                  init_data:
                    instance:
                      destinations:
                      - Authentication: NoAuthentication
                        Name: Instance_Dest_Name1
                        ProxyType: Internet
                        Type: HTTP
                        URL: http://somehost:8080
                        URL.headers.ApiKey: key_value_abcd1234
                      - Authentication: NoAuthentication
                        Name: ui5
                        Type: HTTP
                        URL: https://ui5.sap.com
                        ProxyType: Internet
                      existing_destinations_policy: update
            "
        `);
    });

    it('Adds destination entry in existing mta extension', async () => {
        const testAppPath = '/test-app-mta-ext1';
        const mtaYaml = fs.readFileSync(join(__dirname, 'fixtures/mta-ext/multi/mta.yaml'), 'utf-8');
        const mtaExtYaml = fs.readFileSync(join(__dirname, 'fixtures/mta-ext/multi/mta-ext.mtaext'), 'utf-8');

        memfs.vol.fromNestedJSON(
            {
                [`.${testAppPath}/mta.yaml`]: mtaYaml,
                [`.${testAppPath}/mta-ext.mtaext`]: mtaExtYaml
            },
            '/'
        );

        const mtaConfig = await MtaConfig.newInstance(testAppPath);
        await mtaConfig.addMtaExtensionConfig('Instance_Dest_Name1', 'http://somehost:8080', {
            key: 'ApiKey',
            value: 'key_value_abcd1234'
        });
        expect(fs.readFileSync(`${testAppPath}/${FileName.MtaExtYaml}`, 'utf-8')).toMatchInlineSnapshot(`
            "## SAP UX Tools generated mtaext file
            _schema-version: \\"3.2\\"
            ID: test-mta-ext
            extends: test-mta
            version: 1.0.0

            resources:
              - name: qa-destination-service
                parameters:
                  config:
                    init_data:
                      instance:
                        destinations:
                          - Authentication: NoAuthentication
                            Name: ABHE_NorthwindProduct_theme
                            ProxyType: Internet
                            Type: HTTP
                            URL: https://api.hana.on.demand
                            URL.headers.ApiKey: 1234567890abcdefg
                          - Authentication: NoAuthentication
                            Name: Instance_Dest_Name1
                            ProxyType: Internet
                            Type: HTTP
                            URL: http://somehost:8080
                            URL.headers.ApiKey: key_value_abcd1234
                        existing_destinations_policy: update
            "
        `);
    });
});
