import { removeSync } from 'fs-extra';
import { join } from 'path';
import type { UI5LibConfig } from '../src';
import { generate } from '../src';
import { debug, projectChecks, testOutputDir } from './common';

if (debug?.enabled) {
    jest.setTimeout(360000);
}

describe('Reuse lib templates', () => {
    beforeAll(() => {
        removeSync(testOutputDir); // even for in memory
    });

    const ui5LibConfig: UI5LibConfig = {
        libraryName: 'myui5lib',
        namespace: 'com.sap',
        framework: 'SAPUI5',
        frameworkVersion: '1.102.19',
        author: 'UI5 Lib Author',
        typescript: false
    };
    const V1_113_0 = '1.113.0';
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
            name: 'lib-t-1.113.0',
            config: {
                ...ui5LibConfig,
                libraryName: 'myui5tslib113',
                typescript: true,
                frameworkVersion: V1_113_0
            }
        }
    ];

    test.each(configuration)('Generate files for config: $name', async ({ name, config }) => {
        const projectPath = join(testOutputDir, `${config.namespace}.${config.libraryName}`);
        const fs = await generate(testOutputDir, config);
        expect(fs.dump(join(testOutputDir))).toMatchSnapshot();
        const projectFolder =
            config.namespace && config.namespace.length > 0
                ? `${config.namespace}.${config.libraryName}`
                : `${config.libraryName}`;
        const pkgData = fs.read(join(testOutputDir, projectFolder, 'package.json'));
        const packageJson = JSON.parse(pkgData);
        if (config.typescript === true) {
            if (config.frameworkVersion === V1_113_0) {
                expect(packageJson.devDependencies).toHaveProperty('@sapui5/types');
            } else {
                expect(packageJson.devDependencies).toHaveProperty('@sapui5/ts-types-esm');
            }
        }
        return new Promise(async (resolve) => {
            if (debug) {
                // write out the files for debugging
                fs.commit(resolve);
            } else {
                resolve(true);
            }
        }).then(async () => {
            await projectChecks(projectPath, config, debug?.debugFull);
        });
    });

    // Test to ensure generation will throw error when input is invalid
    it('validate input', async () => {
        const projectDir = join(testOutputDir, 'testapp-fail');

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
