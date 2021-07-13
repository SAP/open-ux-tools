import { Ui5App } from '../src/data';
import { generate } from '../src';
import { join } from 'path';
import { tmpdir } from 'os';
import { rmdirSync } from 'fs';

describe('UI5 templates', () => {
    const debug = !!process.env['UX_DEBUG'];
    const outputDir = join(tmpdir(), '/templates/odata-service');
    if (debug) console.log(outputDir);

    afterEach(() => {
        if (!debug) rmdirSync(outputDir, { recursive: true });
    });

    it('generates files correctly', async () => {
        const fs = await generate(outputDir, {
            app: {
                id: 'myApp',
                title: 'My application'
            },
            package: {
                name: 'Test'
            }
        });
        if (debug) fs.commit(() => 0);
        expect((fs as any).dump(outputDir)).toMatchSnapshot();
    });
});
