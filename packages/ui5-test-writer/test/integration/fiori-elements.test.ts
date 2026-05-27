import { generateOPAFiles } from '../../src/fiori-elements-opa-writer';
import { join } from 'node:path';
import type { Editor } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import fileSystem from 'node:fs';

describe('ui5-test-writer - Integration tests', () => {
    let fs: Editor | undefined;
    const debug = !!process.env['UX_DEBUG'];

    function prepareTestFiles(testConfigurationName: string): string {
        // Copy input templates into output directory
        const inputDir = join(__dirname, '../test-input', testConfigurationName);
        const outputDir = join(__dirname, '../test-output', testConfigurationName);
        fs = create(createStorage());
        if (fileSystem.existsSync(inputDir)) {
            fs.copy(inputDir, outputDir);
        }

        return outputDir;
    }

    afterAll(() => {
        return new Promise((resolve) => {
            // write out the files for debugging
            if (debug && fs) {
                fs.commit(resolve);
                fs = undefined;
            } else {
                fs = undefined;
                resolve(true);
            }
        });
    });

    it('Generate initial OPA test files and add more pages', async () => {
        const projectDir = prepareTestFiles('RestaurantApp');

        // Create initial OPA test files on an LROP project
        fs = await generateOPAFiles(projectDir, {}, fs);

        expect(fs.dump(projectDir)).toMatchSnapshot();
    });

    it('Generate initial OPA test files without using the index.html file', async () => {
        const projectDir = prepareTestFiles('RestaurantApp');

        // Create initial OPA test files on an LROP project
        fs = await generateOPAFiles(
            projectDir,
            { htmlTarget: 'test/flpSandbox.html?sap-ui-xx-viewCache=false#restaurantApp-tile' },
            fs
        );

        expect(fs.dump(projectDir)).toMatchSnapshot();
    });
});
