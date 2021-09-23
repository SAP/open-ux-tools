import { generate } from '../src';
import { join } from 'path';
import { removeSync } from 'fs-extra';

describe('UI5 templates', () => {
    const debug = !!process.env['UX_DEBUG'];
    const outputDir = join(__dirname, '/test-output');
    if (debug) console.log(outputDir);

    beforeAll(() => {
        if (!debug) removeSync( outputDir);
    });

    it('generates files correctly', async () => {
    	const projectDir = join(outputDir,'testapp1');
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
        fs.commit(() => 0)
        expect((fs as any).dump(projectDir)).toMatchSnapshot();
    });
});
