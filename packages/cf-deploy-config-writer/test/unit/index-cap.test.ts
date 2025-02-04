import { join } from 'path';
import fsExtra from 'fs-extra';
import hasbin from 'hasbin';
import { NullTransport, ToolsLogger } from '@sap-ux/logger';
import { generateCAPConfig, RouterModuleType } from '../../src';
import * as childProcess from 'child_process';
import * as projectAccess from '@sap-ux/project-access';
import fs from 'fs';

jest.mock('child_process');
jest.mock('hasbin', () => ({
    ...(jest.requireActual('hasbin') as {}),
    sync: jest.fn()
}));

let hasSyncMock: jest.SpyInstance;
let spawnMock: jest.SpyInstance;
const originalPlatform = process.platform;

jest.mock('child_process');

jest.mock('@sap/mta-lib', () => {
    return {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        Mta: require('./mockMta').MockMta
    };
});

describe('CF Writer CAP', () => {
    jest.setTimeout(10000);
    const logger = new ToolsLogger({
        transports: [new NullTransport()]
    });
    const outputDir = join(__dirname, '../test-output', 'capcds');

    beforeEach(() => {
        jest.resetAllMocks();
        jest.restoreAllMocks();
        hasSyncMock = jest.spyOn(hasbin, 'sync').mockImplementation(() => true);
    });

    beforeAll(() => {
        fsExtra.removeSync(outputDir);
        jest.clearAllMocks();
        jest.spyOn(hasbin, 'sync').mockReturnValue(true);
        jest.mock('hasbin', () => {
            return {
                ...(jest.requireActual('hasbin') as {}),
                sync: hasSyncMock
            };
        });
        Object.defineProperty(process, 'platform', { value: 'win32' });
    });

    afterAll(() => {
        jest.resetAllMocks();
        Object.defineProperty(process, 'platform', {
            value: originalPlatform
        });
    });

    it.each([[RouterModuleType.Managed], [RouterModuleType.Standard]])(
        'Validate generation of CAP mta configurations %s',
        async (routerType: RouterModuleType) => {
            const mtaId = 'captestproject';
            const mtaPath = join(outputDir, routerType, mtaId);
            fsExtra.mkdirSync(mtaPath, { recursive: true });
            fsExtra.copySync(join(__dirname, `../sample/capcds`), mtaPath);
            const getCapProjectTypeMock = jest.spyOn(projectAccess, 'getCapProjectType').mockResolvedValue('CAPNodejs');
            // For testing purposes, an existing mta.yaml is copied to reflect the spawn command;
            // `cds add mta xsuaa connectivity destination html5-repo`
            spawnMock = jest.spyOn(childProcess, 'spawnSync').mockImplementation(() => {
                fsExtra.copySync(join(__dirname, `fixtures/mta-types/cdsmta`), mtaPath);
                return { status: 0 } as any;
            });
            const localFs = await generateCAPConfig(
                {
                    mtaPath,
                    mtaId,
                    routerType
                },
                undefined,
                logger
            );
            expect(localFs.read(join(mtaPath, 'mta.yaml'))).toMatchSnapshot();
            expect(getCapProjectTypeMock).toHaveBeenCalled();
            expect(spawnMock.mock.calls).toHaveLength(2);
            expect(spawnMock).toHaveBeenCalledWith(
                'cds',
                ['add', 'mta', 'xsuaa', 'destination', 'html5-repo'],
                expect.objectContaining({ cwd: expect.stringContaining(mtaId) })
            );
            expect(spawnMock.mock.calls[1][0]).toStrictEqual('npm.cmd'); // Just always test for windows!
            expect(spawnMock.mock.calls[1][1]).toStrictEqual(['install', '--ignore-engines']);
            if (RouterModuleType.Standard === routerType) {
                expect(localFs.read(join(mtaPath, `router`, 'package.json'))).toMatchSnapshot();
                expect(localFs.read(join(mtaPath, `router`, 'xs-app.json'))).toMatchSnapshot();
            }
        }
    );

    test('Validate CAP project type is correct when creating mta.yaml', async () => {
        const mtaId = 'captestproject';
        const mtaPath = join(outputDir, mtaId);
        jest.spyOn(projectAccess, 'getCapProjectType').mockResolvedValue('CAPJava');
        await expect(
            generateCAPConfig(
                {
                    mtaPath,
                    mtaId,
                    routerType: RouterModuleType.Managed
                },
                undefined,
                logger
            )
        ).rejects.toThrowError(/Target folder does not contain a Node.js CAP project./);
    });

    test('Validate CAP type if target contains mta.yaml', async () => {
        const mtaId = 'captestproject';
        const mtaPath = join(outputDir, mtaId);
        jest.spyOn(projectAccess, 'getCapProjectType').mockResolvedValue('CAPNodejs');
        jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        await expect(
            generateCAPConfig(
                {
                    mtaPath,
                    mtaId,
                    routerType: RouterModuleType.Managed
                },
                undefined,
                logger
            )
        ).rejects.toThrowError(/An mta.yaml already exists in the target directory./);
    });
});
