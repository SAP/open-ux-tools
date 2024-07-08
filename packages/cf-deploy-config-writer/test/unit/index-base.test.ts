import { join } from 'path';
import fsExtra from 'fs-extra';
import hasbin from 'hasbin';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { NullTransport, ToolsLogger } from '@sap-ux/logger';
import { generateBaseConfig } from '../../src';
import { RouterModuleType } from '../../src/types';
import { Editor } from 'mem-fs-editor';

jest.mock('@sap-ux/btp-utils', () => ({
    ...jest.requireActual('@sap-ux/btp-utils'),
    isAppStudio: jest.fn(),
    listDestinations: jest.fn()
}));

describe('CF Writer', () => {
    let unitTestFs: Editor;
    const logger = new ToolsLogger({
        transports: [new NullTransport()]
    });
    const outputDir = join(__dirname, '../test-output');
    const debug = !!process.env['UX_DEBUG'];

    beforeEach(() => {
        jest.resetAllMocks();
        jest.restoreAllMocks();
        unitTestFs = create(createStorage());
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

    describe('Generate Base Config - Standalone', () => {
        test('Generate deployment configs - standalone', async () => {
            const debugSpy = jest.spyOn(logger, 'debug');
            const mtaId = 'standalone';
            const mtaPath = join(outputDir, mtaId);
            fsExtra.mkdirSync(outputDir, { recursive: true });
            fsExtra.mkdirSync(mtaPath);
            await generateBaseConfig(
                {
                    mtaPath,
                    mtaId,
                    mtaDescription: 'MyStandaloneDescription',
                    routerType: RouterModuleType.Standard
                },
                unitTestFs,
                logger
            );
            expect(debugSpy).toBeCalledTimes(1);
            expect(unitTestFs.dump(mtaPath)).toMatchSnapshot();
            // Since mta.yaml is not in memfs, read from disk
            expect(unitTestFs.read(join(mtaPath, 'mta.yaml'))).toMatchSnapshot();
        });
    });

    describe('Generate Base Config - Managed', () => {
        test('Generate deployment configs - managed', async () => {
            const debugSpy = jest.spyOn(logger, 'debug');
            const mtaId = 'managed';
            const mtaPath = join(outputDir, mtaId);
            fsExtra.mkdirSync(outputDir, { recursive: true });
            fsExtra.mkdirSync(mtaPath);
            await generateBaseConfig(
                {
                    mtaPath,
                    mtaId,
                    mtaDescription: 'MyManagedDescription',
                    routerType: RouterModuleType.Managed
                },
                unitTestFs,
                logger
            );
            expect(debugSpy).toBeCalledTimes(1);
            expect(unitTestFs.dump(mtaPath)).toMatchSnapshot();
            // Since mta.yaml is not in memfs, read from disk
            expect(unitTestFs.read(join(mtaPath, 'mta.yaml'))).toMatchSnapshot();
        });
    });
});
