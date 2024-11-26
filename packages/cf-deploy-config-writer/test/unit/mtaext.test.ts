import { join } from 'path';
import fs from 'fs';
import * as memfs from 'memfs';
import { MtaConfig } from '../../src/';
import { MTAFileExtension } from '../../src/constants';

jest.mock('fs', () => {
    const fs1 = jest.requireActual('fs');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Union = require('unionfs').Union;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const vol = require('memfs').vol;
    return new Union().use(fs1).use(vol as unknown as typeof fs);
});

jest.mock('@sap/mta-lib', () => {
    return {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        Mta: require('./mockMta').MockMta
    };
});

describe('Adding and Updating mta extension configuration', () => {
    beforeEach(() => {
        jest.resetModules();
        memfs.vol.reset();
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
        expect(fs.readFileSync(`${testAppPath}/${MTAFileExtension}`, 'utf-8')).toMatchInlineSnapshot(`
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
        expect(fs.readFileSync(`${testAppPath}/${MTAFileExtension}`, 'utf-8')).toMatchInlineSnapshot(`
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
