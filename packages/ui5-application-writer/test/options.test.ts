import { generate } from '../src';
import { join } from 'path';
import { removeSync } from 'fs-extra';
import type { Ui5App } from '../src';

describe('UI5 templates', () => {
    const debug = !!process.env['UX_DEBUG'];
    const outputDir = join(__dirname, '/test-output');

    const baseAppConfig: Ui5App = {
        app: {
            id: 'app.with.namespace',
            title: 'Test App Title',
            description: 'Test App Description',
            projectType: 'EDMXBackend'
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

    it('generates options: `sapux` shouldnt be included for CAP project', async () => {
        const projectDir = join(outputDir, 'testapp_options');
        const fs = await generate(projectDir, {
            ...baseAppConfig,
            app: {
                ...baseAppConfig.app,
                projectType: 'CAPJava'
            },
            appOptions: {
                sapux: true
            }
        });
        const packagePath = join(projectDir, 'package.json');
        const packageJson = fs.readJSON(packagePath) as any;
        expect(packageJson['sapux']).toBeUndefined();
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
    it('option: `loadReuseLibs` UI5 1.120.0', async () => {
        const projectDir = join(outputDir, 'testapp_loadReuseLibs_1.120.0');
        const fs = await generate(projectDir, {
            ...baseAppConfig,
            appOptions: {
                loadReuseLibs: true
            },
            ui5: {
                version: '1.120.0'
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
            app: {
                ...baseAppConfig.app,
                flpAction: 'display'
            },
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

    it('option: `sapux and use virtual endpoints`', async () => {
        const projectDir = join(outputDir, 'testapp_typescript');
        const fs = await generate(
            projectDir,
            Object.assign(baseAppConfig, {
                appOptions: {
                    sapux: true,
                    useVirtualPreviewEndpoints: true
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
