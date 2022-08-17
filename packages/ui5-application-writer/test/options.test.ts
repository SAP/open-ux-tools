import { generate } from '../src';
import { join } from 'path';
import { removeSync } from 'fs-extra';

describe('UI5 templates', () => {
    const debug = !!process.env['UX_DEBUG'];
    const outputDir = join(__dirname, '/test-output');
    if (debug) console.log(outputDir);

    const baseAppConfig = {
        app: {
            id: 'testAppId',
            title: 'Test App Title',
            description: 'Test App Description'
        },
        package: {
            name: 'testPackageName'
        }
    };

    beforeAll(() => {
        removeSync(outputDir); // even for in memory
    });

    it('generates options: `codeAssist, eslint, sapux`', async () => {
        const projectDir = join(outputDir, 'testapp_options');
        const fs = await generate(
            projectDir,
            Object.assign(baseAppConfig, {
                appOptions: {
                    codeAssist: true,
                    eslint: true,
                    sapux: true
                }
            })
        );
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

    it('option: `loadReuseLibs`', async () => {
        const projectDir = join(outputDir, 'testapp_loadReuseLibs');
        const fs = await generate(
            projectDir,
            Object.assign(baseAppConfig, {
                appOptions: {
                    loadReuseLibs: true
                }
            })
        );
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

    it('option: `typescript and Fiori tools`', async () => {
        const projectDir = join(outputDir, 'testapp_typescript');
        const fs = await generate(
            projectDir,
            Object.assign(baseAppConfig, {
                appOptions: {
                    typescript: true,
                    sapux: true
                }
            })
        );
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
