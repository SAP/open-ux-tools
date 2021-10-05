import { generate } from '../src';
import { join } from 'path';
import { removeSync } from 'fs-extra';
import { debug } from '../../fiori-freestyle/test/unit/common';

describe('UI5 templates', () => {
    const debug = !!process.env['UX_DEBUG'];
    const outputDir = join(__dirname, '/test-output');
    if (debug) console.log(outputDir);

    beforeAll(() => {
        removeSync(outputDir); // even for in memory
    });

    it('generates files correctly', async () => {
        const projectDir = join(outputDir, 'testapp1');
        const fs = await generate(projectDir, {
            app: {
                id: 'testAppId',
                title: 'Test App Title',
                description: 'Test App Description'
            },
            package: {
                name: 'testPackageName'
            }
        });
        expect((fs as any).dump(projectDir)).toMatchSnapshot();
        return new Promise((resolve) => {
            // write out the files for debugging
            if (debug) {
                fs.commit(resolve);
            } else {
                resolve(true);
            }
        });
    });
});
