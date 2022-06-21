import { generateOPA } from '../src';
import { join } from 'path';
import { removeSync } from 'fs-extra';
import type { Editor } from 'mem-fs-editor';

describe('OPA FE v4 templates', () => {
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
        }
    ];

    it.each(testApplications)('$description', async (config) => {
        const projectDir = join(inputDir, config.dirPath);
        fs = await generateOPA(projectDir);
        expect((fs as any).dump(projectDir)).toMatchSnapshot();
    });
});
