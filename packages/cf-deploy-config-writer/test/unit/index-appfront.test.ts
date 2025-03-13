import { join } from 'path';
import fsExtra from 'fs-extra';
import hasbin from 'hasbin';
import * as btp from '@sap-ux/btp-utils';
import { generateAppConfig } from '../../src';
import { create, type Editor } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';

jest.mock('@sap-ux/btp-utils', () => ({
    ...jest.requireActual('@sap-ux/btp-utils'),
    isAppStudio: jest.fn().mockReturnValue(false)
}));

jest.mock('hasbin', () => ({
    ...(jest.requireActual('hasbin') as {}),
    sync: jest.fn()
}));

jest.mock('@sap/mta-lib', () => {
    return {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        Mta: require('./mockMta').MockMta
    };
});

let hasSyncMock: jest.SpyInstance;
let unitTestFs: Editor;

describe('CF Writer App - Application Frontend', () => {
    jest.setTimeout(10000);

    const outputDir = join(__dirname, '../test-output', 'appfrontend');

    beforeEach(() => {
        jest.resetAllMocks();
        jest.restoreAllMocks();
        hasSyncMock = jest.spyOn(hasbin, 'sync').mockImplementation(() => true);
        unitTestFs = create(createStorage());
    });

    beforeAll(() => {
        jest.clearAllMocks();
        jest.spyOn(hasbin, 'sync').mockReturnValue(true);
        fsExtra.removeSync(outputDir);
        jest.mock('hasbin', () => {
            return {
                ...(jest.requireActual('hasbin') as {}),
                sync: hasSyncMock
            };
        });
    });

    afterAll(() => {
        jest.resetAllMocks();
    });

    test('Generate deployment configs - HTML5 App with app frontend approuter attached with no destination available', async () => {
        const appName = 'lrop';
        const appPath = join(outputDir, appName);
        fsExtra.mkdirSync(outputDir, { recursive: true });
        fsExtra.mkdirSync(appPath);
        fsExtra.copySync(join(__dirname, `../sample/lrop`), appPath);
        await generateAppConfig({ appPath, addManagedAppFrontend: true }, unitTestFs);
        // Since mta.yaml is not in memfs, read from disk
        expect(unitTestFs.read(join(appPath, 'mta.yaml'))).toMatchSnapshot();
        expect(unitTestFs.read(join(appPath, 'xs-app.json'))).toMatchSnapshot();
    });

    test('Generate deployment configs - Add 2nd HTML5 app to app frontend router', async () => {
        const rootName = 'rootmta';
        const rootPath = join(outputDir, rootName);
        const appPath = join(rootPath, 'basicapp');
        fsExtra.mkdirSync(outputDir, { recursive: true });
        fsExtra.mkdirSync(rootPath);
        fsExtra.copySync(join(__dirname, `../sample/rootmta`), rootPath); // Base mta
        fsExtra.copySync(join(__dirname, `../sample/basicapp`), appPath); // Base -> App
        await generateAppConfig({ appPath: appPath, addManagedAppFrontend: true }, unitTestFs);
        // unitTestFs.dump(rootPath);
        expect(unitTestFs.read(join(rootPath, 'mta.yaml'))).toMatchSnapshot();
        expect(unitTestFs.read(join(appPath, 'xs-app.json'))).toMatchSnapshot();
    });
});
