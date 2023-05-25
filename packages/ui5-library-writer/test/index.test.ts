import { create as createStorage } from 'mem-fs';
import { removeSync } from 'fs-extra';
import { create } from 'mem-fs-editor';
import { join } from 'path';
import type { UI5LibConfig } from '../src';
import { generate } from '../src';

describe('Reuse lib templates', () => {
    const fs = create(createStorage());
    const debug = !!process.env['UX_DEBUG'];
    const outputDir = join(__dirname, '/test-output');

    beforeAll(() => {
        removeSync(outputDir); // even for in memory
    });

    afterAll(() => {
        return new Promise((resolve) => {
            // write out the files for debugging
            if (debug) {
                fs.commit(resolve);
            } else {
                resolve(true);
            }
        });
    });

    const ui5LibConfig: UI5LibConfig = {
        libraryName: 'myUI5Lib',
        namespace: 'com.sap',
        framework: 'SAPUI5',
        frameworkVersion: '1.102.19',
        author: 'Cian Morrin',
        typescript: false
    };

    it('generates files correctly', async () => {
        await generate(outputDir, ui5LibConfig, fs);
        expect(fs.dump(join(outputDir))).toMatchSnapshot();

        // with typescript
        const ui5LibTSConfig: UI5LibConfig = {
            ...ui5LibConfig,
            libraryName: 'myUI5TSLib',
            typescript: true
        };
        await generate(outputDir, ui5LibTSConfig, fs);
        expect(fs.read(join(outputDir, 'com.sap.myUI5TSLib', 'tsconfig.json'))).toMatchSnapshot();
        expect(fs.read(join(outputDir, 'com.sap.myUI5TSLib', 'src', '.babelrc.json'))).toMatchSnapshot();

        // with typescript and version 1.113.1
        await generate(outputDir, { ...ui5LibTSConfig, libraryName: 'myUI5TSLib2', frameworkVersion: '1.113.1' }, fs);
        const pkgData = fs.read(join(outputDir, 'com.sap.myUI5TSLib2', 'package.json'));
        const packageJson = JSON.parse(pkgData);
        expect(packageJson.devDependencies).toHaveProperty('@sapui5/types');
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
        ).rejects.toThrowErrorMatchingInlineSnapshot(`"The property: libraryName contains disallowed characters: \\""`);

        // Ensure undefined, null or '' cannot be used
        await expect(
            generate(projectDir, {
                ...ui5LibConfig,
                libraryName: ''
            })
        ).rejects.toThrowErrorMatchingInlineSnapshot(`"The property: libraryName must have a value"`);
    });
});
