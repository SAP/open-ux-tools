import { generate } from '../src';
import { join } from 'path';
import { removeSync } from 'fs-extra';
import { Editor } from 'mem-fs-editor';
import { SapUxLayer } from '@sap-ux/open-ux-tools-types';

describe('UI5 templates', () => {
    let fs: Editor;
    const debug = !!process.env['UX_DEBUG'];
    const outputDir = join(__dirname, '/test-output');
    if (debug) console.log(outputDir);

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

    it('generates simple options', async () => {
        const projectDir = join(outputDir, 'testapp_simple_options');
        fs = await generate(projectDir, {
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
        expect((fs as any).dump(projectDir)).toMatchSnapshot();
    });

    it('generates templated options', async () => {
        const projectDir = join(outputDir, 'testapp_templated_options');
        fs = await generate(projectDir, {
            app: {
                id: 'testAppId',
                title: 'Test App Title',
                description: 'Test App Description'
            },
            package: {
                name: 'testPackageName'
            },
            appOptions: {
                sapux: true,
                sapuxLayer: SapUxLayer.CUSTOMER_BASE
            }
        });
        expect((fs as any).dump(projectDir)).toMatchSnapshot();
    });
});
