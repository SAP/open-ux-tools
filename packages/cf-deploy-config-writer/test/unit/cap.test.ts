import { jest } from '@jest/globals';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import fsExtra from 'fs-extra';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import type { Editor } from 'mem-fs-editor';

const __dirname = join(fileURLToPath(import.meta.url), '..');

const realBtpUtils = await import('@sap-ux/btp-utils');
jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    ...realBtpUtils,
    isAppStudio: jest.fn()
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

const realProjectAccess = await import('@sap-ux/project-access');
jest.unstable_mockModule('@sap-ux/project-access', () => ({
    ...realProjectAccess,
    getMtaPath: jest.fn().mockImplementation(realProjectAccess.getMtaPath),
    findCapProjectRoot: jest.fn().mockImplementation(realProjectAccess.findCapProjectRoot),
    getCapProjectType: jest.fn()
}));

const hasbin = await import('hasbin');
const btpUtils = await import('@sap-ux/btp-utils');
const projectAccess = await import('@sap-ux/project-access');
const { generateAppConfig } = await import('../../src');
const { DefaultMTADestination, MTABinNotFound } = await import('../../src/constants');
const { CommandRunner } = await import('@sap-ux/nodejs-utils');

const isAppStudioMock = btpUtils.isAppStudio as jest.Mock;

let hasSyncMock: jest.Mock;
let commandRunnerMock: ReturnType<typeof jest.spyOn>;
let unitTestFs: Editor;

describe('CF Writer', () => {
    const outputDir = join(__dirname, '../test-output', 'cap');

    beforeEach(() => {
        jest.resetAllMocks();
        jest.restoreAllMocks();
        unitTestFs = create(createStorage());
        commandRunnerMock = jest.spyOn(CommandRunner.prototype, 'run').mockImplementation(() => ({ status: 0 }) as any);
        isAppStudioMock.mockReturnValue(false);
        hasSyncMock = (hasbin.sync as jest.Mock).mockImplementation(() => true);
        // Re-apply real implementations after resetAllMocks clears them
        (projectAccess.getMtaPath as jest.Mock).mockImplementation(realProjectAccess.getMtaPath);
        (projectAccess.findCapProjectRoot as jest.Mock).mockImplementation(realProjectAccess.findCapProjectRoot);
    });

    beforeAll(async () => {
        jest.clearAllMocks();
        fsExtra.removeSync(outputDir);
    });

    afterAll(async () => {
        jest.resetAllMocks();
    });

    describe('Generate deployment config for CAP project', () => {
        test('Add destination instance to a HTML5 app inside a CAP project', async () => {
            const capPath = join(outputDir, 'cap');
            const getMtaPathMock = jest.spyOn(projectAccess, 'getMtaPath');
            const findCapProjectRootMock = jest.spyOn(projectAccess, 'findCapProjectRoot');
            fsExtra.mkdirSync(outputDir, { recursive: true });
            fsExtra.mkdirSync(capPath);
            fsExtra.copySync(join(__dirname, '../sample/cap'), capPath);
            await generateAppConfig(
                {
                    appPath: join(capPath, 'app/lrop'),
                    destinationName: DefaultMTADestination,
                    addManagedAppRouter: true
                },
                unitTestFs
            );
            expect(getMtaPathMock).toHaveBeenCalledWith(expect.stringContaining(capPath));
            expect(findCapProjectRootMock).toHaveBeenCalledTimes(1);
            expect(findCapProjectRootMock).toHaveBeenCalledWith(expect.stringContaining(capPath));
            expect(commandRunnerMock).not.toHaveBeenCalled();
            expect(unitTestFs.dump(capPath)).toMatchSnapshot();
            expect(unitTestFs.read(join(capPath, 'mta.yaml'))).toMatchSnapshot();
        });

        test('Validate dependency on MTA binary', async () => {
            hasSyncMock.mockReturnValue(false);
            const capPath = join(outputDir, 'cap');
            await expect(generateAppConfig({ appPath: capPath }, unitTestFs, undefined)).rejects.toThrow(
                MTABinNotFound
            );
        });

        test('Validate error is thrown if cds fails', async () => {
            commandRunnerMock = jest.spyOn(CommandRunner.prototype, 'run').mockRejectedValue(new Error('Fault'));
            const capPath = join(outputDir, 'capcds');
            fsExtra.mkdirSync(outputDir, { recursive: true });
            fsExtra.mkdirSync(capPath);
            fsExtra.copySync(join(__dirname, '../sample/basiccap'), capPath);
            await expect(
                generateAppConfig(
                    {
                        appPath: join(capPath, 'app/lrop'),
                        destinationName: DefaultMTADestination,
                        addManagedAppRouter: true
                    },
                    unitTestFs,
                    undefined
                )
            ).rejects.toThrow(/An error occurred when creating the mta.yaml file/);
            expect(commandRunnerMock).toHaveBeenCalledTimes(1);
        });
    });

    test('Validate HTML5 app is added with a managed approuter to an existing a CAP project', async () => {
        const capPath = join(outputDir, 'capcdsmta');
        fsExtra.mkdirSync(outputDir, { recursive: true });
        fsExtra.mkdirSync(capPath);
        fsExtra.copySync(join(__dirname, '../sample/capcds'), capPath);
        // Copy over sample mta.yaml generated, when using the command `cds add mta xsuaa destination html5-repo`
        fsExtra.copySync(join(__dirname, './fixtures/mta-types/cdsmta'), capPath);
        await generateAppConfig(
            {
                appPath: join(capPath, 'app/project1'),
                destinationName: DefaultMTADestination
            },
            unitTestFs,
            undefined
        );
        expect(unitTestFs.dump(capPath)).toMatchSnapshot();
    });

    test('Validate HTML5 is added without a managed approuter to a CAP project', async () => {
        const capPath = join(outputDir, 'capcdsmtastandalone');
        fsExtra.mkdirSync(outputDir, { recursive: true });
        fsExtra.mkdirSync(capPath);
        fsExtra.copySync(join(__dirname, '../sample/capcds'), capPath);
        // Copy over sample mta.yaml generated, when using the command `cds add mta xsuaa destination html5-repo`
        fsExtra.copySync(join(__dirname, './fixtures/mta-types/cdsmta'), capPath);
        await generateAppConfig(
            {
                appPath: join(capPath, 'app/project1'),
                destinationName: DefaultMTADestination,
                addManagedAppRouter: false
            },
            unitTestFs,
            undefined
        );
        expect(unitTestFs.dump(capPath)).toMatchSnapshot();
    });

    test('Validate a 2nd HTML5 app is added', async () => {
        const capPath = join(outputDir, 'capcdsmulti');
        fsExtra.mkdirSync(outputDir, { recursive: true });
        fsExtra.mkdirSync(capPath);
        fsExtra.copySync(join(__dirname, '../sample/capcdsmulti'), capPath);
        // Copy over sample mta.yaml generated, when using the command `cds add mta xsuaa destination html5-repo`
        fsExtra.copySync(join(__dirname, './fixtures/mta-types/cdsmulti'), capPath);
        // Step1. Add existing app with managed approuter
        await generateAppConfig(
            {
                appPath: join(capPath, 'app/project1'),
                destinationName: DefaultMTADestination,
                addManagedAppRouter: true
            },
            unitTestFs,
            undefined
        );
        expect(unitTestFs.dump(capPath)).toMatchSnapshot();
        expect(unitTestFs.read(join(capPath, 'mta.yaml'))).toMatchSnapshot();
    });
});
