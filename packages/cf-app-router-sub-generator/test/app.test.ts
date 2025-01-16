import * as fs from 'fs';
import yeomanTest from 'yeoman-test';
import { join } from 'path';
import * as memfs from 'memfs';
import AbapDeployGenerator from '../src/app';

// Use an in-memory filesystem to generate the artifacts into.
// `unionfs` is used to unify node's std fs and memfs
jest.mock('fs', () => {
    const fs1 = jest.requireActual('fs');
    const Union = require('unionfs').Union;
    const vol = require('memfs').vol;
    const _fs = new Union().use(fs1);
    _fs.constants = fs1.constants;
    return _fs.use(vol as unknown as typeof fs);
});

describe('Test abap deploy configuration generator', () => {
    jest.setTimeout(60000);
    let cwd: string;
    const OUTPUT_DIR_PREFIX = join(`/output`);
    const abapDeployGenPath = join(__dirname, '../src/app/');

    beforeEach(() => {
        jest.clearAllMocks();
        memfs.vol.reset();
    });

    beforeEach(() => {
        const mockChdir = jest.spyOn(process, 'chdir');
        mockChdir.mockImplementation((dir): void => {
            cwd = dir;
        });
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    it('test', async () => {
        const appDir = (cwd = OUTPUT_DIR_PREFIX);
        await expect(
            yeomanTest
                .create(
                    AbapDeployGenerator,
                    {
                        resolved: abapDeployGenPath
                    },
                    {
                        cwd: appDir
                    }
                )
                .withOptions({ skipInstall: true })
                .run()
        ).resolves.not.toThrow();
    });
});
