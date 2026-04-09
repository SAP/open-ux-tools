import { jest } from '@jest/globals';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import fsExtra from 'fs-extra';
import { create, type Editor } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import fs from 'node:fs';

const __dirname = join(fileURLToPath(import.meta.url), '..');

const realBtpUtils = await import('@sap-ux/btp-utils');
jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    ...realBtpUtils,
    isAppStudio: jest.fn().mockReturnValue(false)
}));

const realHasbin = await import('hasbin');
jest.unstable_mockModule('hasbin', () => ({
    ...realHasbin,
    sync: jest.fn()
}));

const { MockMta } = await import('./mockMta');
jest.unstable_mockModule('@sap/mta-lib', () => ({
    Mta: MockMta
}));

const hasbin = await import('hasbin');
const { generateAppConfig } = await import('../../src');
const { CommandRunner } = await import('@sap-ux/nodejs-utils');

let hasSyncMock: jest.Mock;
let unitTestFs: Editor;
let commandRunnerMock: ReturnType<typeof jest.spyOn>;

describe('CF Writer App - Application Frontend', () => {
    const outputDir = join(__dirname, '../test-output', 'appfrontend');

    beforeEach(() => {
        jest.resetAllMocks();
        jest.restoreAllMocks();
        hasSyncMock = (hasbin.sync as jest.Mock).mockImplementation(() => true);
        commandRunnerMock = jest.spyOn(CommandRunner.prototype, 'run').mockImplementation(() => ({ status: 0 }) as any);
        unitTestFs = create(createStorage());
    });

    beforeAll(() => {
        jest.clearAllMocks();
        fsExtra.removeSync(outputDir);
    });

    afterAll(() => {
        jest.resetAllMocks();
    });

    test('Generate deployment configs - HTML5 App with app frontend service attached with no destination available', async () => {
        const appName = 'lrop';
        const appPath = join(outputDir, appName);
        fsExtra.mkdirSync(outputDir, { recursive: true });
        fsExtra.mkdirSync(appPath);
        fsExtra.copySync(join(__dirname, `../sample/lrop`), appPath);
        await generateAppConfig({ appPath, addAppFrontendRouter: true }, unitTestFs);
        expect(unitTestFs.read(join(appPath, 'mta.yaml'))).toMatchSnapshot();
        expect(unitTestFs.read(join(appPath, 'xs-app.json'))).toMatchSnapshot();
        expect(unitTestFs.read(join(appPath, 'xs-security.json'))).toMatchSnapshot();
    });

    test('Generate deployment configs - Add 2nd HTML5 app to app frontend router', async () => {
        const rootName = 'rootmta';
        const rootPath = join(outputDir, rootName);
        const appPath = join(rootPath, 'basicapp');
        fsExtra.mkdirSync(outputDir, { recursive: true });
        fsExtra.mkdirSync(rootPath);
        fsExtra.copySync(join(__dirname, `../sample/rootmta`), rootPath); // Base mta
        fsExtra.copySync(join(__dirname, `../sample/basicapp`), appPath); // Base -> App
        await generateAppConfig({ appPath, addAppFrontendRouter: true }, unitTestFs);
        expect(unitTestFs.read(join(appPath, 'xs-app.json'))).toMatchSnapshot();
        expect(unitTestFs.read(join(rootPath, 'xs-security.json'))).toMatchSnapshot();
        expect(unitTestFs.read(join(rootPath, 'package.json'))).toMatchSnapshot();
        expect(fs.readFileSync(join(rootPath, 'mta.yaml'), { encoding: 'utf8' })).toMatchSnapshot();
    });

    test('Generate deployment configs - Append HTML5 to an existing app frontend router', async () => {
        const rootName = 'existingappfrontend';
        const rootPath = join(outputDir, rootName);
        const appPath = join(rootPath, 'basicapp');
        fsExtra.mkdirSync(outputDir, { recursive: true });
        fsExtra.mkdirSync(rootPath);
        fsExtra.copySync(join(__dirname, `../sample/appfrontendbase`), rootPath); // Base mta
        fsExtra.copySync(join(__dirname, `../sample/basicapp`), appPath); // Base -> App
        await generateAppConfig({ appPath, addManagedAppRouter: false, addAppFrontendRouter: false }, unitTestFs);
        expect(unitTestFs.read(join(appPath, 'xs-app.json'))).toMatchSnapshot();
        expect(unitTestFs.read(join(rootPath, 'xs-security.json'))).toMatchSnapshot();
        expect(unitTestFs.read(join(rootPath, 'package.json'))).toMatchSnapshot();
        expect(fs.readFileSync(join(rootPath, 'mta.yaml'), { encoding: 'utf8' })).toMatchSnapshot();
    });
});
