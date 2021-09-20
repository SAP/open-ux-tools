import { generate } from '../src';
import { join } from 'path';
import { rmdirSync } from 'fs';

describe('UI5 templates', () => {
    const debug = !!process.env['UX_DEBUG'];
    const outputDir = join(__dirname, '/test-output');
    if (debug) console.log(outputDir);

    beforeAll(() => {
        if (!debug) rmdirSync(outputDir, { recursive: true });
    });

    it('generates options', async () => {
    	const projectDir = join(outputDir,'testapp_options');
        const fs = await generate(projectDir, {
            app: {
                id: 'testAppId',
                title: 'Test App Title',
                description: 'Test App Description'
            },
            package: {
                name: 'testPackageName'
            },
            appOptions: {
                codeAssist: true,
                eslint: true,
                sapux: true
            }
        });
        fs.commit(() => 0)
        expect((fs as any).dump(projectDir)).toMatchSnapshot();
    });
});
