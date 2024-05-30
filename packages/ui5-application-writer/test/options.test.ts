import { generate } from '../src';
import { join } from 'path';
import { removeSync } from 'fs-extra';

describe('UI5 templates', () => {
    const debug = !!process.env['UX_DEBUG'];
    const outputDir = join(__dirname, '/test-output');

    const baseAppConfig = {
        app: {
            id: 'app.with.namespace',
            title: 'Test App Title',
            description: 'Test App Description'
        },
        'package': {
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
        expect(fs.dump(projectDir)).toMatchSnapshot();
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
        expect(fs.dump(projectDir)).toMatchSnapshot();
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
        expect(fs.dump(projectDir)).toMatchSnapshot();
        return new Promise((resolve) => {
            // write out the files for debugging
            if (debug) {
                fs.commit(resolve);
            } else {
                resolve(true);
            }
        });
    });

    it('option: `typescript, npm modules and Fiori tools`', async () => {
        const projectDir = join(outputDir, 'testapp_typescript');
        const fs = await generate(
            projectDir,
            Object.assign(baseAppConfig, {
                appOptions: {
                    typescript: true,
                    sapux: true,
                    npmPackageConsumption: true
                }
            })
        );
        expect(fs.dump(projectDir)).toMatchSnapshot();
        return new Promise((resolve) => {
            // write out the files for debugging
            if (debug) {
                fs.commit(resolve);
            } else {
                resolve(true);
            }
        });
    });

    it('option: `typescript and code assist` to check for conflicts', async () => {
        const projectDir = join(outputDir, 'testapp_tsandcodeassist');
        const fs = await generate(
            projectDir,
            Object.assign(baseAppConfig, {
                appOptions: {
                    typescript: true,
                    codeAssist: true
                }
            })
        );
        expect(fs.read(join(projectDir, 'package.json'))).toMatchSnapshot();
        expect(fs.read(join(projectDir, 'tsconfig.json'))).toMatchSnapshot();
        expect(fs.read(join(projectDir, '.eslintrc'))).toMatchSnapshot();
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
