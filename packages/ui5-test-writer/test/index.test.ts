import { generateOPAFiles, generatePageObjectFile } from '../src';
import { join } from 'path';
import { removeSync } from 'fs-extra';
import type { Editor } from 'mem-fs-editor';

describe('ui5-test-writer', () => {
    let fs: Editor;
    const debug = !!process.env['UX_DEBUG'];
    const inputDir = join(__dirname, '/test-input');
    const outputDir = join(__dirname, '/test-output');

    beforeAll(() => {
        removeSync(outputDir); // even for in memory
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
            fs = await generatePageObjectFile(projectDir, config.targetKey);
            expect((fs as any).dump(projectDir)).toMatchSnapshot();
        });
    });

    describe('generateOPAFiles', () => {
        const testApplications = [
            {
                description: 'Fullscreen LR-OP',
                dirPath: 'FullScreenLROP'
            },
            {
                description: 'FCL LR-OP',
                dirPath: 'FclLROP'
            },
            {
                description: 'Fullscreen start on OP',
                dirPath: 'FullScreenOP'
            },
            {
                description: 'FCL start on OP',
                dirPath: 'FclOP'
            },
            {
                description: 'Fullscreen only OP without start page',
                dirPath: 'FullScreenOPNoStart'
            },
            {
                description: 'Fullscreen with 2 Sub-OP',
                dirPath: 'FullScreenSubOP'
            },
            {
                description: 'Fullscreen with custom FPM page',
                dirPath: 'CustomOP'
            }
        ];

        it.each(testApplications)('$description', async (config) => {
            const projectDir = join(inputDir, config.dirPath);
            fs = await generateOPAFiles(projectDir);
            expect((fs as any).dump(projectDir)).toMatchSnapshot();
        });
    });
});
