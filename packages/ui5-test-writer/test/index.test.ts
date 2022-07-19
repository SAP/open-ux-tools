import { generateOPAFiles, generatePageObjectFile } from '../src';
import { join } from 'path';
import { removeSync } from 'fs-extra';
import type { Editor } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';

describe('ui5-test-writer', () => {
    let fs: Editor;
    const debug = !!process.env['UX_DEBUG'];
    const inputDir = join(__dirname, 'test-output');

    beforeEach(() => {
        fs = create(createStorage());
        fs.copy(join(__dirname, 'test-input'), inputDir);
    });

    afterEach(() => {
        return new Promise((resolve) => {
            // write out the files for debugging
            if (debug) {
                fs.commit(resolve);
            } else {
                resolve(true);
            }
        });
    });

    describe('generatePageObjectFile', () => {
        const testPages = [
            {
                description: 'ListReport',
                targetKey: 'EmployeesListTarget'
            },
            {
                description: 'Object Page',
                targetKey: 'EmployeesObjectPageTarget'
            },
            {
                description: 'FPM custom',
                targetKey: 'EmployeesCustomPageTarget'
            },
            {
                description: 'Another component view (not supported)',
                targetKey: 'AnotherCustomPageTarget'
            },
            {
                description: 'Plain XML view (not supported)',
                targetKey: 'XMLView'
            },
            {
                description: 'Missing ID',
                targetKey: 'NoID'
            },
            {
                description: 'Missing entityset',
                targetKey: 'NoEntitySet'
            },
            {
                description: 'Bad target',
                targetKey: 'XXX'
            }
        ];

        it.each(testPages)('$description', async (config) => {
            const projectDir = join(inputDir, 'Pages');
            fs = await generatePageObjectFile(projectDir, { targetKey: config.targetKey }, fs);
            expect((fs as any).dump(projectDir)).toMatchSnapshot();
        });

        it('No manifest', async () => {
            const projectDir = join(inputDir, 'Not_Here');
            let error: string | undefined;
            try {
                fs = await generatePageObjectFile(projectDir, { targetKey: 'xx' }, fs);
            } catch (e) {
                error = (e as Error).message;
            }

            expect(error?.startsWith('Validation error: Cannot read manifest file')).toEqual(true);
        });
    });

    describe('generateOPAFiles', () => {
        const testApplications = [
            {
                description: 'Fullscreen LR-OP',
                dirPath: 'FullScreenLROP',
                scriptName: undefined
            },
            {
                description: 'FCL LR-OP',
                dirPath: 'FclLROP',
                scriptName: 'myOPATest'
            },
            {
                description: 'Fullscreen start on OP',
                dirPath: 'FullScreenOP',
                scriptName: undefined
            },
            {
                description: 'FCL start on OP',
                dirPath: 'FclOP',
                scriptName: undefined
            },
            {
                description: 'Fullscreen only OP without start page',
                dirPath: 'FullScreenOPNoStart',
                scriptName: undefined
            },
            {
                description: 'Fullscreen with 2 Sub-OP',
                dirPath: 'FullScreenSubOP',
                scriptName: undefined
            },
            {
                description: 'Fullscreen with custom FPM page',
                dirPath: 'CustomOP',
                scriptName: undefined
            }
        ];

        it.each(testApplications)('$description', async (config) => {
            const projectDir = join(inputDir, config.dirPath);
            fs = await generateOPAFiles(projectDir, { scriptName: config.scriptName }, fs);
            expect((fs as any).dump(projectDir)).toMatchSnapshot();
        });

        it('No manifest', async () => {
            const projectDir = join(inputDir, 'Not_Here');
            let error: string | undefined;
            try {
                fs = await generateOPAFiles(projectDir, {}, fs);
            } catch (e) {
                error = (e as Error).message;
            }

            expect(error?.startsWith('Validation error: Cannot read manifest file')).toEqual(true);
        });

        it('Missing app ID', async () => {
            const projectDir = join(inputDir, 'MissingAppId');
            let error: string | undefined;
            try {
                fs = await generateOPAFiles(projectDir, {}, fs);
            } catch (e) {
                error = (e as Error).message;
            }

            expect(error).toEqual('Validation error: Cannot read appID in the manifest file');
        });
    });
});
