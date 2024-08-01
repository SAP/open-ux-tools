import { join } from 'path';
import fs from 'fs';
import * as memfs from 'memfs';
import { NullTransport, ToolsLogger } from '@sap-ux/logger';
import { isMTAFound, useAbapDirectServiceBinding, MtaConfig } from '../../src/';
import { deployMode, ResourceMTADestination } from '../../src/constants';
import type { mta } from '@sap/mta-lib';

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

describe('Validate common functionality', () => {
    const nullLogger = new ToolsLogger({ transports: [new NullTransport()] });
    const OUTPUT_DIR_PREFIX = '/abap-service';
    const abapServiceMta = fs.readFileSync(join(__dirname, 'fixtures/mta-types/abap-service/mta.yaml'), 'utf-8');

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

    it('returns true when there is an mta.yaml in the current directory', () => {
        const dirName = 'somedir';
        memfs.vol.fromNestedJSON({
            [`./${dirName}/mta.yaml`]: ''
        });
        expect(isMTAFound(dirName)).toBeTruthy();
    });

    it('returns false when there is no isMTAFound.yaml in the current directory', () => {
        const dirName = 'somedir';
        memfs.vol.fromNestedJSON({});
        expect(isMTAFound(dirName)).toBeFalsy();
    });

    it('Validate isAbapDirectServiceBinding', async () => {
        memfs.vol.fromNestedJSON(
            {
                './mta.yaml': ''
            },
            '/'
        );
        expect(await useAbapDirectServiceBinding('/testpath', true)).toBeFalsy();
        expect(await useAbapDirectServiceBinding('/testpath', false, '/testpath')).toBeFalsy();
    });

    it('Validate isAbapDirectServiceBinding is true', async () => {
        memfs.vol.fromNestedJSON(
            {
                [`.${OUTPUT_DIR_PREFIX}/app1/mta.yaml`]: abapServiceMta
            },
            '/'
        );
        expect(await useAbapDirectServiceBinding(`${OUTPUT_DIR_PREFIX}/app1/`, true)).toBeTruthy();
    });

    it('Validate isAbapDirectServiceBinding handles exception', async () => {
        memfs.vol.fromNestedJSON(
            {
                [`.${OUTPUT_DIR_PREFIX}/app1/mta.yaml`]: ''
            },
            '/'
        );
        expect(await useAbapDirectServiceBinding(`/`, false, OUTPUT_DIR_PREFIX, nullLogger)).toBeFalsy();
    });
});

describe('Validate MtaConfig Instance', () => {
    const OUTPUT_DIR_PREFIX = '/managed-cap';
    const managedRouterConfigCapMissingDestinations = fs.readFileSync(
        join(__dirname, 'fixtures/mta-types/managed-cap-missing-destinations/mta.yaml'),
        'utf-8'
    );
    const managedRouterConfigCap = fs.readFileSync(join(__dirname, 'fixtures/mta-types/managed-cap/mta.yaml'), 'utf-8');
    const managedRouterConfig = fs.readFileSync(join(__dirname, 'fixtures/mta-types/managed-apps/mta.yaml'), 'utf-8');
    const appDir = `${OUTPUT_DIR_PREFIX}/app1`;

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

    it('Validate destinations are retrieved for a compliant mta config', async () => {
        memfs.vol.fromNestedJSON(
            {
                [`.${OUTPUT_DIR_PREFIX}/app1/mta.yaml`]: managedRouterConfigCap
            },
            '/'
        );
        const mtaConfig = await MtaConfig.newInstance(appDir);
        expect(mtaConfig.getExposedDestinations()).toMatchInlineSnapshot(`Array []`);
        expect(mtaConfig.isABAPServiceFound).toBeFalsy();
        expect(await mtaConfig.getParameters()).toMatchInlineSnapshot(`
            Object {
              "enable-parallel-deployments": true,
            }
        `);
    });

    it('Validate destinations are retrieved for an mta config missing destinations', async () => {
        memfs.vol.fromNestedJSON(
            {
                [`.${OUTPUT_DIR_PREFIX}/app1/mta.yaml`]: managedRouterConfigCapMissingDestinations
            },
            '/'
        );
        const mtaConfig = await MtaConfig.newInstance(appDir);
        expect(mtaConfig.getExposedDestinations()).toMatchInlineSnapshot(`
            Array [
              "myTestApp_managedApp_repo_host",
              "myTestApp_uaa_managedApp",
            ]
        `);
    });

    it('(Non-CAP) Validate destinations are retrieved for an mta config', async () => {
        memfs.vol.fromNestedJSON(
            {
                [`.${OUTPUT_DIR_PREFIX}/app1/mta.yaml`]: managedRouterConfig
            },
            '/'
        );
        const mtaConfig = await MtaConfig.newInstance(appDir);
        expect(mtaConfig.getExposedDestinations(true)).toMatchInlineSnapshot(`
            Array [
              "northwind",
            ]
        `);
    });

    it.each([
        ['%s.-srv-api', 'managedApp_-srv-api'],
        ['%s-srv-api', 'managedApp-srv-api'],
        ['%s123!@#&-srv-api', 'managedApp123____-srv-api']
    ])('Format when destination name is %s', async (destinationName, correctDest) => {
        memfs.vol.fromNestedJSON({ [`${appDir}/mta.yaml`]: managedRouterConfig }, '/');
        const mtaConfig = await MtaConfig.newInstance(appDir);
        const formattedDestinationName = mtaConfig.getFormattedPrefix(destinationName);
        expect(formattedDestinationName).toEqual(correctDest);
    });
});

describe('Validate common flows', () => {
    const nullLogger = new ToolsLogger({ transports: [new NullTransport()] });
    const OUTPUT_DIR_PREFIX = '/managed-cap';
    const managedBasicMTA = fs.readFileSync(join(__dirname, 'fixtures/mta-types/managed-basic/mta.yaml'), 'utf-8');
    const standaloneBasicMTA = fs.readFileSync(
        join(__dirname, 'fixtures/mta-types/standalone-basic/mta.yaml'),
        'utf-8'
    );
    const standaloneMTA = fs.readFileSync(join(__dirname, 'fixtures/mta-types/standalone/mta.yaml'), 'utf-8');
    const capBasicMTA = fs.readFileSync(join(__dirname, 'fixtures/mta-types/managed-cap/mta.yaml'), 'utf-8');
    const managedMissingDestinationMTA = fs.readFileSync(
        join(__dirname, 'fixtures/mta-types/managed-missing-dest/mta.yaml'),
        'utf-8'
    );

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

    it('Validate adding managed approuter', async () => {
        memfs.vol.fromNestedJSON(
            {
                [`.${OUTPUT_DIR_PREFIX}/app1/mta.yaml`]: managedBasicMTA
            },
            '/'
        );
        const mtaConfig = await MtaConfig.newInstance(`${OUTPUT_DIR_PREFIX}/app1`, nullLogger);
        await mtaConfig.addRoutingModules(true);
        await mtaConfig.addApp('myhtml5app', './');
        await mtaConfig.addConnectivityResource(); //typical for onpremise destinations
        await mtaConfig.save();
        expect(mtaConfig.standaloneRouterPath).toBeUndefined();
        expect(await mtaConfig.getParameters()).toMatchInlineSnapshot(`
            Object {
              "deploy_mode": "html5-repo",
              "enable-parallel-deployments": true,
            }
        `);
        const expectAfterYaml = fs.readFileSync(`${OUTPUT_DIR_PREFIX}/app1/mta.yaml`, 'utf-8');
        expect(expectAfterYaml).toMatchSnapshot();
    });

    it('Validate destination service is correctly updated if missing instances', async () => {
        memfs.vol.fromNestedJSON(
            {
                [`.${OUTPUT_DIR_PREFIX}/app2/mta.yaml`]: managedMissingDestinationMTA
            },
            '/'
        );
        const mtaConfig = await MtaConfig.newInstance(`${OUTPUT_DIR_PREFIX}/app2`);
        await mtaConfig.addRoutingModules(true);
        await mtaConfig.save();
        const expectAfterYaml = fs.readFileSync(`${OUTPUT_DIR_PREFIX}/app2/mta.yaml`, 'utf-8');
        expect(expectAfterYaml).toMatchSnapshot();
    });

    it('Validate adding standalone approuter', async () => {
        memfs.vol.fromNestedJSON(
            {
                [`.${OUTPUT_DIR_PREFIX}/app3/mta.yaml`]: standaloneBasicMTA
            },
            '/'
        );
        const mtaConfig = await MtaConfig.newInstance(`${OUTPUT_DIR_PREFIX}/app3`);
        await mtaConfig.addStandaloneRouter(true);
        await mtaConfig.addRoutingModules();
        await mtaConfig.addApp('myhtml5app', './');
        await mtaConfig.addAbapService('abapservice', 'abapservice');
        await mtaConfig.addConnectivityResource(); //typical for onpremise destinations
        await mtaConfig.save();
        expect(mtaConfig.standaloneRouterPath).toEqual('router');
        expect(await mtaConfig.getParameters()).toMatchInlineSnapshot(`
            Object {
              "deploy_mode": "html5-repo",
              "enable-parallel-deployments": true,
            }
        `);
        const expectAfterYaml = fs.readFileSync(`${OUTPUT_DIR_PREFIX}/app3/mta.yaml`, 'utf-8');
        expect(expectAfterYaml).toMatchSnapshot();
    });

    it('Validate adding standalone approuter with missing module destination', async () => {
        memfs.vol.fromNestedJSON(
            {
                [`.${OUTPUT_DIR_PREFIX}/app4/mta.yaml`]: standaloneMTA
            },
            '/'
        );
        const mtaConfig = await MtaConfig.newInstance(`${OUTPUT_DIR_PREFIX}/app4`);
        await mtaConfig.addRoutingModules();
        await mtaConfig.save();
        const expectAfterYaml = fs.readFileSync(`${OUTPUT_DIR_PREFIX}/app4/mta.yaml`, 'utf-8');
        expect(expectAfterYaml).toMatchSnapshot();
    });

    it('Validate adding managed approuter and destinations to cds generated mta.yaml', async () => {
        memfs.vol.fromNestedJSON(
            {
                [`.${OUTPUT_DIR_PREFIX}/app5/mta.yaml`]: capBasicMTA
            },
            '/'
        );
        const mtaConfig = await MtaConfig.newInstance(`${OUTPUT_DIR_PREFIX}/app5`);
        await mtaConfig.addRoutingModules(true);
        await mtaConfig.addApp('myhtml5app', './');
        const parameters = await mtaConfig.getParameters();
        const params = { ...parameters, ...{} } as mta.Parameters;
        params[deployMode] = 'html5-repo';
        await mtaConfig.updateParameters(params);
        await mtaConfig.appendInstanceBasedDestination(mtaConfig.getFormattedPrefix(ResourceMTADestination));
        expect(mtaConfig.cloudServiceName).toEqual('managedAppCAPProject');
        expect(mtaConfig.hasManagedXsuaaResource()).toBeTruthy();
        await mtaConfig.save();
        expect(await mtaConfig.getParameters()).toMatchInlineSnapshot(`
            Object {
              "deploy_mode": "html5-repo",
              "enable-parallel-deployments": true,
            }
        `);
        const expectAfterYaml = fs.readFileSync(`${OUTPUT_DIR_PREFIX}/app5/mta.yaml`, 'utf-8');
        expect(expectAfterYaml).toMatchSnapshot();
    });
});
