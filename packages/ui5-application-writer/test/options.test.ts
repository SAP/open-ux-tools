import { generate, addEslintFeature } from '../src';
import type { Package } from '@sap-ux/project-access';
import { join } from 'node:path';
import { removeSync } from 'fs-extra';
import type { Ui5App } from '../src';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';

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

    it('option: `typescript and eslint` to check for conflicts', async () => {
        const projectDir = join(outputDir, 'testapp_ts_and_eslint');
        const fs = await generate(
            projectDir,
            Object.assign(baseAppConfig, {
                appOptions: {
                    typescript: true,
                    eslint: true
                }
            })
        );
        expect(fs.read(join(projectDir, 'package.json'))).toMatchSnapshot();
        expect(fs.read(join(projectDir, 'tsconfig.json'))).toMatchSnapshot();
        expect(fs.read(join(projectDir, 'eslint.config.mjs'))).toMatchSnapshot();
        return new Promise((resolve) => {
            // write out the files for debugging
            if (debug) {
                fs.commit(resolve);
            } else {
                resolve(true);
            }
        });
    });

    it('addEslintFeature: adds eslint configuration to a project', async () => {
        const projectDir = join(outputDir, 'testapp_addEslintFeature');
        const store = createStorage();
        const fs = create(store);

        // Create a basic package.json file first
        const packageJsonPath = join(projectDir, 'package.json');
        fs.writeJSON(packageJsonPath, {
            name: 'test-project',
            version: '1.0.0',
            scripts: {
                start: 'fiori run'
            },
            devDependencies: {
                '@ui5/cli': '^3.0.0'
            }
        });

        // Add eslint feature
        await addEslintFeature(projectDir, fs);

        // Verify that eslint.config.mjs was created
        const eslintConfigPath = join(projectDir, 'eslint.config.mjs');
        expect(fs.exists(eslintConfigPath)).toBe(true);
        const eslintConfig = fs.read(eslintConfigPath);
        expect(eslintConfig).toContain('@sap-ux/eslint-plugin-fiori-tools');
        expect(eslintConfig).toContain('fioriTools.configs.recommended');

        // Verify that package.json was updated with eslint dependencies and script
        const updatedPackageJson = fs.readJSON(packageJsonPath) as Package;
        expect(updatedPackageJson?.scripts?.lint).toBe('eslint ./');
        expect(updatedPackageJson?.devDependencies?.['@sap-ux/eslint-plugin-fiori-tools']).toBe('^9.0.0');
        expect(updatedPackageJson?.devDependencies?.['eslint']).toBe('^9');
        // Verify existing dependencies are preserved
        expect(updatedPackageJson?.devDependencies?.['@ui5/cli']).toBe('^3.0.0');
        expect(updatedPackageJson?.scripts?.start).toBe('fiori run');

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
