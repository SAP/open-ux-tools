import * as childProcess from 'child_process';
import * as projectAccess from '@sap-ux/project-access';
import { join } from 'path';
import fsExtra from 'fs-extra';
import hasbin from 'hasbin';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { generateAppConfig } from '../../src';
import type { Editor } from 'mem-fs-editor';
import { DefaultMTADestination, MTABinNotFound, CDSBinNotFound } from '../../src/constants';
import { isAppStudio } from '@sap-ux/btp-utils';

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

jest.mock('child_process');

let hasSyncMock: jest.SpyInstance;
let spawnMock: jest.SpyInstance;
let unitTestFs: Editor;

describe('CF Writer', () => {
    const outputDir = join(__dirname, '../test-output', 'cap');

    beforeEach(() => {
        jest.resetAllMocks();
        jest.restoreAllMocks();
        unitTestFs = create(createStorage());
        spawnMock = jest.spyOn(childProcess, 'spawnSync').mockImplementation(() => ({ status: 0 } as any));
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
            expect(getMtaPathMock).toBeCalledWith(expect.stringContaining(capPath));
            expect(findCapProjectRootMock).toBeCalledWith(expect.stringContaining(capPath));
            expect(spawnMock).not.toHaveBeenCalled();
            expect(unitTestFs.dump(capPath)).toMatchSnapshot();
            expect(unitTestFs.read(join(capPath, 'mta.yaml'))).toMatchSnapshot();
        });

        test('Validate dependency on MTA binary', async () => {
            hasSyncMock.mockReturnValue(false);
            const capPath = join(outputDir, 'cap');
            await expect(generateAppConfig({ appPath: capPath }, unitTestFs)).rejects.toThrowError(MTABinNotFound);
        });

        test('Validate error is thrown if cds fails', async () => {
            spawnMock = jest.spyOn(childProcess, 'spawnSync').mockImplementation(() => ({ error: 1 } as any));
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
                    unitTestFs
                )
            ).rejects.toThrowError(/Something went wrong creating mta.yaml!/);
            expect(spawnMock).not.toHaveBeenCalledWith('');
        });
    });
});
