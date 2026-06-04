import { generateOPAFiles } from '../../src/fiori-elements-opa-writer.js';
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
        fs = await generateOPAFiles(projectDir, {}, undefined, fs);

        expect(fs.dump(projectDir)).toMatchSnapshot();
    });

    it('Generate initial OPA test files without using the index.html file', async () => {
        const projectDir = prepareTestFiles('RestaurantApp');

        // Create initial OPA test files on an LROP project
        fs = await generateOPAFiles(
            projectDir,
            { htmlTarget: 'test/flpSandbox.html?sap-ui-xx-viewCache=false#restaurantApp-tile' },
            undefined,
            fs
        );

        expect(fs.dump(projectDir)).toMatchSnapshot();
    });

    it('Generate TypeScript OPA test files for LROP app', async () => {
        const projectDir = prepareTestFiles('RestaurantApp');

        fs = await generateOPAFiles(projectDir, { enableTypeScript: true }, undefined, fs);

        const dumped = fs.dump(projectDir);
        const paths = Object.keys(dumped);

        // Verify TS files are generated
        expect(paths.some((p) => p.includes('FirstJourney.ts'))).toBe(true);
        expect(paths.some((p) => p.includes('JourneyRunner.ts'))).toBe(true);
        expect(paths.some((p) => p.includes('RestaurantList.ts') && p.includes('pages/'))).toBe(true);
        expect(paths.some((p) => p.includes('RestaurantObjectPage.ts') && p.includes('pages/'))).toBe(true);
        expect(paths.some((p) => p.includes('OpaJourneyTypes.d.ts'))).toBe(true);

        // No JS page/journey files generated (opaTests.qunit.js is allowed)
        const jsIntegrationFiles = paths.filter(
            (p) => p.includes('integration/') && p.endsWith('.js') && !p.includes('opaTests.qunit')
        );
        expect(jsIntegrationFiles).toHaveLength(0);

        expect(dumped).toMatchSnapshot();
    });
});
