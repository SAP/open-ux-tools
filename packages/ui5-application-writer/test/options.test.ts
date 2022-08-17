import { generate } from '../src';
import { join } from 'path';
import { removeSync } from 'fs-extra';

const mockSpecVersions = JSON.stringify({ latest: '1.102.3', 'UI5-1.71': '1.71.64', 'UI5-1.92': '1.92.1' });
jest.mock('child_process', () => ({
    spawn: () => ({
        stdout: {
            on: (_event: string, fn: Function) => fn(mockSpecVersions)
        },
        stderr: {
            on: jest.fn()
        },
        on: (_event: string, fn: Function) => fn(0)
    })
}));

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
        const fs = await generate(projectDir, {
            ...baseAppConfig,
            appOptions: {
                codeAssist: true,
                eslint: true,
                sapux: true
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

    it('option: `loadReuseLibs`', async () => {
        const projectDir = join(outputDir, 'testapp_loadReuseLibs');
        const fs = await generate(projectDir, {
            ...baseAppConfig,
            appOptions: {
                loadReuseLibs: true
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

    it('generates options: `sapux` with specific version', async () => {
        const projectDir = join(outputDir, 'testapp_options');
        const fs = await generate(projectDir, {
            ...baseAppConfig,
            appOptions: {
                sapux: true
            },
            ui5: {
                version: '1.92.1'
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
