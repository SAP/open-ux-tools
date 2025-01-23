import { join } from 'path';
import fsExtra from 'fs-extra';
import hasbin from 'hasbin';
import { NullTransport, ToolsLogger } from '@sap-ux/logger';
import { generateCAPConfig, RouterModuleType } from '../../src';
import * as childProcess from 'child_process';
jest.mock('child_process');

jest.mock('hasbin', () => ({
    ...(jest.requireActual('hasbin') as {}),
    sync: jest.fn()
}));

let hasSyncMock: jest.SpyInstance;
let spawnMock: jest.SpyInstance;

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
    });

    afterAll(() => {
        jest.resetAllMocks();
        // fsExtra.removeSync(outputDir);
    });

    it.each([[RouterModuleType.Managed], [RouterModuleType.Standard]])(
        'Validate generation of CAP mta configurations %s',
        async (routerType: RouterModuleType) => {
            const mtaId = 'captestproject';
            const mtaPath = join(outputDir, routerType, mtaId);
            fsExtra.mkdirSync(mtaPath, { recursive: true });
            fsExtra.copySync(join(__dirname, `../sample/capcds`), mtaPath);
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
            expect(spawnMock).toHaveBeenCalledWith(
                'cds',
                ['add', 'mta', 'xsuaa', 'destination', 'html5-repo'],
                expect.objectContaining({ cwd: expect.stringContaining(mtaId) })
            );
            if (RouterModuleType.Standard === routerType) {
                expect(localFs.read(join(mtaPath, `router`, 'package.json'))).toMatchSnapshot();
                expect(localFs.read(join(mtaPath, `router`, 'xs-app.json'))).toMatchSnapshot();
            }
        }
    );
});
