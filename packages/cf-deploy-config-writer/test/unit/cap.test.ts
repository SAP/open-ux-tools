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

let spawnMock: jest.SpyInstance;
let unitTestFs: Editor;

describe('CF Writer', () => {
    const outputDir = join(__dirname, '../test-output');
    const debug = !!process.env['UX_DEBUG'];

    beforeEach(() => {
        jest.resetAllMocks();
        jest.restoreAllMocks();
        unitTestFs = create(createStorage());
        spawnMock = jest.spyOn(childProcess, 'spawnSync').mockImplementation(() => ({ status: 0 } as any));
        isAppStudioMock.mockReturnValue(false);
    });

    beforeAll(async () => {
        jest.clearAllMocks();
        jest.spyOn(hasbin, 'sync').mockReturnValue(true);
        fsExtra.removeSync(outputDir);
    });

    afterAll(async () => {
        jest.resetAllMocks();
        return new Promise((resolve) => {
            // write out the files for debugging
            if (debug) {
                unitTestFs.commit(resolve);
            } else {
                resolve(true);
            }
        });
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
                    destination: DefaultMTADestination,
                    addManagedRouter: true
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
            jest.spyOn(hasbin, 'sync').mockReturnValue(false);
            const capPath = join(outputDir, 'cap');
            await expect(generateAppConfig({ appPath: capPath }, unitTestFs)).rejects.toThrowError(MTABinNotFound);
        });

        test('Validate dependency on CDS', async () => {
            spawnMock = jest.spyOn(childProcess, 'spawnSync').mockImplementation(() => ({ error: 1 } as any));
            const capPath = join(outputDir, 'capcds');
            fsExtra.mkdirSync(outputDir, { recursive: true });
            fsExtra.mkdirSync(capPath);
            fsExtra.copySync(join(__dirname, '../sample/basiccap'), capPath);
            await expect(
                generateAppConfig(
                    {
                        appPath: join(capPath, 'app/lrop'),
                        destination: DefaultMTADestination,
                        addManagedRouter: true
                    },
                    unitTestFs
                )
            ).rejects.toThrowError(CDSBinNotFound);
            expect(spawnMock).not.toHaveBeenCalledWith('');
        });
    });
});
