import * as projectAccess from '@sap-ux/project-access';
import { join } from 'path';
import fsExtra from 'fs-extra';
import hasbin from 'hasbin';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { generateAppConfig, generateCAPConfig, RouterModuleType } from '../../src';
import type { Editor } from 'mem-fs-editor';
import { DefaultMTADestination } from '../../src/constants';
import { isAppStudio } from '@sap-ux/btp-utils';
import { NullTransport, ToolsLogger } from '@sap-ux/logger';
import { CommandRunner } from '@sap-ux/nodejs-utils';
import fs from 'fs';

jest.mock('@sap/mta-lib', () => {
    return {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        Mta: require('./mockMta').MockMta
    };
});

jest.mock('@sap-ux/btp-utils', () => ({
    ...jest.requireActual('@sap-ux/btp-utils'),
    isAppStudio: jest.fn()
}));
const isAppStudioMock = isAppStudio as jest.Mock;

let hasSyncMock: jest.SpyInstance;
let commandRunnerMock: jest.SpyInstance;
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
        commandRunnerMock = jest.spyOn(CommandRunner.prototype, 'run').mockImplementation(() => ({ status: 0 } as any));
        isAppStudioMock.mockReturnValue(false);
        hasSyncMock = jest.spyOn(hasbin, 'sync').mockImplementation(() => true);
    });

    beforeAll(async () => {
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
            expect(getMtaPathMock).toBeCalledWith(expect.stringContaining(capPath));
            expect(findCapProjectRootMock).toHaveBeenCalledTimes(1);
            expect(findCapProjectRootMock).toBeCalledWith(expect.stringContaining(capPath));
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
