import { jest } from '@jest/globals';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import fsExtra from 'fs-extra';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import type { Editor } from 'mem-fs-editor';
import fs from 'node:fs';

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
const { NullTransport, ToolsLogger } = await import('@sap-ux/logger');
const { generateAppConfig, generateCAPConfig, RouterModuleType } = await import('../../src');
const { DefaultMTADestination } = await import('../../src/constants');
const { CommandRunner } = await import('@sap-ux/nodejs-utils');

const isAppStudioMock = btpUtils.isAppStudio as jest.Mock;

let hasSyncMock: jest.Mock;
let commandRunnerMock: ReturnType<typeof jest.spyOn>;
let unitTestFs: Editor;
const originalPlatform = process.platform;

describe('CF Writer with CAP App Frontend', () => {
    const outputDir = join(__dirname, '../test-output', 'capwithappfrontend');
    const logger = new ToolsLogger({
        transports: [new NullTransport()]
    });

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
        Object.defineProperty(process, 'platform', {
            value: originalPlatform
        });
    });

    describe('Generate deployment config', () => {
        test('Add HTML5 app to CAP App Frontend Project', async () => {
            const capPath = join(outputDir, 'cap');
            const getMtaPathMock = jest.spyOn(projectAccess, 'getMtaPath');
            const findCapProjectRootMock = jest.spyOn(projectAccess, 'findCapProjectRoot');
            fsExtra.mkdirSync(outputDir, { recursive: true });
            fsExtra.mkdirSync(capPath);
            fsExtra.copySync(join(__dirname, '../sample/capwithfrontend'), capPath);
            const localFs = await generateAppConfig(
                {
                    appPath: join(capPath, 'app/lrop'),
                    destinationName: DefaultMTADestination,
                    addAppFrontendRouter: true
                },
                unitTestFs
            );
            expect(getMtaPathMock).toHaveBeenCalledWith(expect.stringContaining(capPath));
            expect(findCapProjectRootMock).toHaveBeenCalledTimes(1);
            expect(findCapProjectRootMock).toHaveBeenCalledWith(expect.stringContaining(capPath));
            expect(commandRunnerMock).not.toHaveBeenCalled();
            expect(localFs.read(join(capPath, 'app/lrop', 'xs-app.json'))).toMatchSnapshot();
            expect(localFs.read(join(capPath, 'xs-security.json'))).toMatchSnapshot();
            expect(localFs.read(join(capPath, 'package.json'))).toMatchSnapshot();
            expect(fs.readFileSync(join(capPath, 'mta.yaml'), { encoding: 'utf8' })).toMatchSnapshot();
        });

        test('Generate CAP project with App Frontend Service', async () => {
            Object.defineProperty(process, 'platform', {
                value: 'win32'
            });
            const mtaId = 'base';
            const mtaPath = join(outputDir, mtaId);
            fsExtra.mkdirSync(mtaPath, { recursive: true });
            fsExtra.copySync(join(__dirname, `../sample/capcds`), mtaPath);
            const getCapProjectTypeMock = jest.spyOn(projectAccess, 'getCapProjectType').mockResolvedValue('CAPNodejs');
            const localFs = await generateCAPConfig(
                {
                    mtaPath,
                    mtaId,
                    routerType: RouterModuleType.AppFront
                },
                undefined,
                logger
            );
            expect(localFs.read(join(mtaPath, 'package.json'))).toMatchSnapshot();
            expect(fs.readFileSync(join(mtaPath, 'mta.yaml'), { encoding: 'utf8' })).toMatchSnapshot();
            expect(localFs.read(join(mtaPath, 'xs-security.json'))).toMatchSnapshot();
            expect(getCapProjectTypeMock).toHaveBeenCalled();
            expect(commandRunnerMock).not.toHaveBeenCalled();
        });
    });
});
