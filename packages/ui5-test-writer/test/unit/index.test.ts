import { generateOPAFiles, generatePageObjectFile } from '../../src';
import { join } from 'path';
import type { Editor } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import fileSystem from 'fs';

describe('ui5-test-writer', () => {
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

    afterEach(() => {
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

    describe('generatePageObjectFile', () => {
        const testPages = [
            {
                description: 'ListReport',
                targetKey: 'EmployeesListTarget'
            },
            {
                description: 'Object Page',
                targetKey: 'EmployeesObjectPageTarget'
            },
            {
                description: 'FPM custom',
                targetKey: 'EmployeesCustomPageTarget'
            }
        ];
        const testUnsupportedPages = [
            {
                description: 'Another component view (not supported)',
                targetKey: 'AnotherCustomPageTarget',
                errorMsg: 'Validation error: Cannot generate page file for target AnotherCustomPageTarget'
            },
            {
                description: 'Plain XML view (not supported)',
                targetKey: 'XMLView',
                errorMsg: 'Validation error: Cannot generate page file for target XMLView'
            },
            {
                description: 'Missing ID',
                targetKey: 'NoID',
                errorMsg: 'Validation error: Cannot generate page file for target NoID'
            },
            {
                description: 'Missing entityset',
                targetKey: 'NoEntitySet',
                errorMsg: 'Validation error: Cannot generate page file for target NoEntitySet'
            },
            {
                description: 'Bad target',
                targetKey: 'XXX',
                errorMsg: 'Validation error: Cannot generate page file for target XXX'
            }
        ];

        it.each(testPages)('$description', async (config) => {
            const projectDir = prepareTestFiles('Pages');
            fs = await generatePageObjectFile(projectDir, { targetKey: config.targetKey }, fs);
            expect(fs.dump(projectDir)).toMatchSnapshot();
        });

        it.each(testUnsupportedPages)('$description', async (config) => {
            const projectDir = prepareTestFiles('Pages');
            let error: string | undefined;
            try {
                fs = await generatePageObjectFile(projectDir, { targetKey: config.targetKey }, fs);
            } catch (e) {
                error = (e as Error).message;
            }

            expect(error).toEqual(config.errorMsg);
        });

        it('No manifest', async () => {
            const projectDir = prepareTestFiles('Not_Here');
            let error: string | undefined;
            try {
                fs = await generatePageObjectFile(projectDir, { targetKey: 'xx' }, fs);
            } catch (e) {
                error = (e as Error).message;
            }

            expect(error?.startsWith('Validation error: Cannot read manifest file')).toEqual(true);
        });

        it('Providing an app ID', async () => {
            const projectDir = prepareTestFiles('Pages');
            fs = await generatePageObjectFile(
                projectDir,
                { targetKey: 'EmployeesListTarget', appID: 'test.ui5-test-writer' },
                fs
            );
            expect(fs.dump(projectDir)).toMatchSnapshot();
        });
    });

    describe('generateOPAFiles', () => {
        const testApplications = [
            {
                description: 'Fullscreen LR-OP',
                dirPath: 'FullScreenLROP',
                scriptName: undefined
            },
            {
                description: 'FCL LR-OP',
                dirPath: 'FclLROP',
                scriptName: 'myOPATest'
            },
            {
                description: 'Fullscreen start on OP',
                dirPath: 'FullScreenOP',
                scriptName: undefined
            },
            {
                description: 'FCL start on OP',
                dirPath: 'FclOP',
                scriptName: undefined
            },
            {
                description: 'Fullscreen only OP without start page',
                dirPath: 'FullScreenOPNoStart',
                scriptName: undefined
            },
            {
                description: 'Fullscreen with 2 Sub-OP',
                dirPath: 'FullScreenSubOP',
                scriptName: undefined
            },
            {
                description: 'Fullscreen with custom FPM page',
                dirPath: 'CustomOP',
                scriptName: undefined
            },
            {
                description: 'Fullscreen With LR only',
                dirPath: 'FullScreenLR',
                scriptName: undefined
            }
        ];

        it.each(testApplications)('$description', async (config) => {
            const projectDir = prepareTestFiles(config.dirPath);
            fs = await generateOPAFiles(projectDir, { scriptName: config.scriptName }, fs);
            expect(fs.dump(projectDir)).toMatchSnapshot();
        });

        it('No manifest', async () => {
            const projectDir = prepareTestFiles('Not_Here');
            let error: string | undefined;
            try {
                fs = await generateOPAFiles(projectDir, {}, fs);
            } catch (e) {
                error = (e as Error).message;
            }

            expect(error?.startsWith('Validation error: Cannot read manifest file')).toEqual(true);
        });

        it('Missing app ID', async () => {
            const projectDir = prepareTestFiles('MissingAppId');
            let error: string | undefined;
            try {
                fs = await generateOPAFiles(projectDir, {}, fs);
            } catch (e) {
                error = (e as Error).message;
            }

            expect(error).toEqual('Validation error: Cannot read appID in the manifest file');
        });

        it('Providing an app ID', async () => {
            const projectDir = prepareTestFiles('MissingAppId');
            fs = await generateOPAFiles(projectDir, { appID: 'test.ui5-test-writer' }, fs);
            expect(fs.dump(projectDir)).toMatchSnapshot();
        });

        it('Freestyle app not supported', async () => {
            const projectDir = prepareTestFiles('FreeStyle');
            let error: string | undefined;
            try {
                fs = await generateOPAFiles(projectDir, {}, fs);
            } catch (e) {
                error = (e as Error).message;
            }

            expect(error).toEqual(
                'Validation error: Cannot determine application type from the manifest, or unsupported type'
            );
        });

        it('FE V2 not supported', async () => {
            const projectDir = prepareTestFiles('ODataV2');
            let error: string | undefined;
            try {
                fs = await generateOPAFiles(projectDir, {}, fs);
            } catch (e) {
                error = (e as Error).message;
            }

            expect(error).toEqual(
                'Validation error: Cannot determine application type from the manifest, or unsupported type'
            );
        });
    });
});
