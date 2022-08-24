import { generateOPAFiles, generatePageObjectFile } from '../../src';
import { join } from 'path';
import type { Editor } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import fileSystem from 'fs';

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
        const projectDir = prepareTestFiles('FullScreenLROP');

        function addTargetInManifest(targetKey: string, targetObject: any) {
            const manifestPath = join(projectDir, 'webapp/manifest.json');
            const manifest = fs?.readJSON(manifestPath) as any;
            manifest['sap.ui5'].routing.targets[targetKey] = targetObject;
            fs?.writeJSON(manifestPath, manifest);
        }

        // Create initial OPA test files on an LROP project
        fs = await generateOPAFiles(projectDir, {}, fs);

        // Add a SubOP page (FEV4 object page)
        const SubOP = {
            type: 'Component',
            id: 'SubObjectPage',
            name: 'sap.fe.templates.ObjectPage',
            options: {
                settings: {
                    entitySet: 'anything'
                }
            }
        };
        addTargetInManifest('SubOP', SubOP);
        fs = await generatePageObjectFile(projectDir, { targetKey: 'SubOP' }, fs);

        // Add a custom FPM page
        const CustomPage = {
            type: 'Component',
            id: 'Custom',
            name: 'sap.fe.core.fpm',
            options: {
                settings: {
                    entitySet: 'anythingElse'
                }
            }
        };
        addTargetInManifest('CustomPage', CustomPage);
        fs = await generatePageObjectFile(projectDir, { targetKey: 'CustomPage' }, fs);

        expect((fs as any).dump(projectDir)).toMatchSnapshot();
    });
});
