import { create as createStorage } from 'mem-fs';
import { removeSync } from 'fs-extra';
import { create } from 'mem-fs-editor';
import { join } from 'path';
import { UI5LibConfig } from '../src';
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

    const ui5LibTSConfig: UI5LibConfig = {
        ...ui5LibConfig,
        libraryName: 'myUI5TSLib',
        typescript: true
    };

    it('generates files correctly', async () => {
        const projectDir = join(outputDir, 'testlib-simple');
        await generate(projectDir, ui5LibConfig, fs);
        expect(fs.dump(projectDir)).toMatchSnapshot();
    });

    it('generates files correctly (typescript)', async () => {
        const projectDir = join(outputDir, 'testlib-simple');
        await generate(projectDir, ui5LibTSConfig, fs);
        expect(fs.dump(projectDir)).toMatchSnapshot();
    });

    it('generates files correctly (typescript, UI5 version > 1.113.0)', async () => {
        const projectDir = join(outputDir, 'testlib-simple');
        await generate(projectDir, { ...ui5LibTSConfig, libraryName: 'myUI5Lib2', frameworkVersion: '1.113.1' });
        expect(fs.dump(projectDir)).toMatchSnapshot();
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
