import { reuseLibs } from './test-input/libs';
import { generate } from '../src/index';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { join } from 'path';
import fsextra from 'fs-extra';

describe('Test UI5 Library Reference Writer', () => {
    const fs = create(createStorage());
    const testOutputDir = join(__dirname, '/test-output');
    const debug = !!process.env['UX_DEBUG'];

    beforeAll(() => {
        fsextra.removeSync(testOutputDir);
    });

    afterAll(() => {
        return new Promise((resolve) => {
            // write out the files for debugging
            if (debug) {
                fs.commit(resolve);
            } else {
                fsextra.removeSync(testOutputDir);
                resolve(true);
            }
        });
    });

    it('should generate the UI5 library reference', async () => {
        const testProjectPath = join(testOutputDir, 'test_project_lrop_v2');
        fsextra.mkdirSync(testOutputDir, { recursive: true });
        fsextra.mkdirSync(testProjectPath);
        fsextra.copySync(join(__dirname, '/test-input/sample-projects/test_project_lrop_v2'), testProjectPath);
        await generate(testProjectPath, reuseLibs, fs);
        expect(fs.dump(testProjectPath, '**/webapp/*.json')).toMatchSnapshot();
        const ui5YamlContent = fs.dump(testProjectPath, '**/ui5.yaml')['ui5.yaml'].contents;
        expect(ui5YamlContent).toContain(`fiori-tools-servestatic`);
        expect(ui5YamlContent).toContain(`src: ${join('../../../sample/libs/my.namespace.reuse.attachmentservice')}`);
    });

    it('should generate the UI5 library reference in a project with a custom webapp path', async () => {
        const testProjectPath = join(testOutputDir, 'test_project_lrop_v2_custom_webapp_path');
        fsextra.mkdirSync(testOutputDir, { recursive: true });
        fsextra.mkdirSync(testProjectPath);
        fsextra.copySync(
            join(__dirname, '/test-input/sample-projects/test_project_lrop_v2_custom_webapp_path'),
            testProjectPath
        );
        await generate(testProjectPath, reuseLibs, fs);
        expect(fs.dump(testProjectPath, '**/src/main/webapp/*.json')).toMatchSnapshot();
        const ui5YamlContent = fs.dump(testProjectPath, '**/ui5.yaml')['ui5.yaml'].contents;
        expect(ui5YamlContent).toContain(`fiori-tools-servestatic`);
        expect(ui5YamlContent).toContain(`src: ${join('../../../sample/libs/my.namespace.reuse.attachmentservice')}`);
    });

    it('should generate the UI5 library reference (sap.ui5.dependencies.libs does not exist)', async () => {
        const testProjectPath = join(testOutputDir, 'test_project_lrop_no_lib_deps');
        fsextra.mkdirSync(testOutputDir, { recursive: true });
        fsextra.mkdirSync(testProjectPath);
        fsextra.copySync(join(__dirname, '/test-input/sample-projects/test_project_lrop_no_lib_deps'), testProjectPath);
        await generate(testProjectPath, reuseLibs);
        expect(fs.dump(testProjectPath, '**/webapp/*.json')).toMatchSnapshot();
    });
});
