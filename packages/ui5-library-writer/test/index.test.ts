import { create as createStorage } from 'mem-fs';
import { removeSync } from 'fs-extra';
import { create } from 'mem-fs-editor';
import { join } from 'path';
import type { UI5LibConfig } from '../src';
import { generate } from '../src';

describe('Reuse lib templates', () => {
    const debug = !!process.env['UX_DEBUG'];
    const outputDir = join(__dirname, '/test-output');

    beforeAll(() => {
        removeSync(outputDir); // even for in memory
    });

    const ui5LibConfig: UI5LibConfig = {
        libraryName: 'myui5lib',
        namespace: 'com.sap',
        framework: 'SAPUI5',
        frameworkVersion: '1.102.19',
        author: 'Cian Morrin',
        typescript: false
    };
    const V1_113_1 = '1.113.1';
    const configuration = [
        {
            name: 'lib-js',
            config: { ...ui5LibConfig }
        },
        {
            name: 'lib-ts',
            config: {
                ...ui5LibConfig,
                libraryName: 'myui5tslib',
                typescript: true
            }
        },
        {
            name: 'lib-t-1.113.1',
            config: {
                ...ui5LibConfig,
                libraryName: 'myui5tslib113',
                typescript: true,
                frameworkVersion: V1_113_1
            }
        }
    ];

    test.each(configuration)('Generate files for config: $name', async ({ name, config }) => {
        const fs = await generate(outputDir, config);
        expect(fs.dump(join(outputDir))).toMatchSnapshot();
        const projectFolder =
            config.namespace && config.namespace.length > 0
                ? `${config.namespace}.${config.libraryName}`
                : `${config.libraryName}`;
        const pkgData = fs.read(join(outputDir, projectFolder, 'package.json'));
        const packageJson = JSON.parse(pkgData);
        if (config.typescript === true) {
            if (config.frameworkVersion === V1_113_1) {
                expect(packageJson.devDependencies).toHaveProperty('@sapui5/types');
            } else {
                expect(packageJson.devDependencies).toHaveProperty('@sapui5/ts-types-esm');
            }
        }
        return new Promise(async (resolve) => {
            // write out the files for debugging
            if (debug) {
                fs.commit(resolve);
            } else {
                resolve(true);
            }
        });
    });

    // Test to ensure generation will throw error when input is invalid
    it('validate input', async () => {
        const projectDir = join(outputDir, 'testapp-fail');

        // Ensure double-quote cannot be used
        await expect(
            generate(projectDir, {
                ...ui5LibConfig,
                libraryName: 'test"AppId'
            })
        ).rejects.toThrowErrorMatchingInlineSnapshot(
            `"Please use lowercase alpha numeric characters only for the property libraryName"`
        );

        // Ensure undefined, null or '' cannot be used
        await expect(
            generate(projectDir, {
                ...ui5LibConfig,
                libraryName: ''
            })
        ).rejects.toThrowErrorMatchingInlineSnapshot(`"The property: libraryName must have a value"`);
    });
});
