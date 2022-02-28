import { generate } from '../src';
import { join } from 'path';
import { removeSync } from 'fs-extra';
import { Editor } from 'mem-fs-editor';

describe('UI5 templates', () => {
    let fs: Editor;
    const debug = !!process.env['UX_DEBUG'];
    const outputDir = join(__dirname, '/test-output');
    if (debug) console.log(outputDir);

    beforeAll(() => {
        removeSync(outputDir); // even for in memory
    });

    afterEach(() => {
        return new Promise((resolve) => {
            // write out the files for debugging
            if (debug) {
                fs.commit(resolve);
            } else {
                resolve(true);
            }
        });
    });

    it('generates files correctly', async () => {
        const projectDir = join(outputDir, 'testapp1');
        fs = await generate(projectDir, {
            app: {
                id: 'testAppId',
                title: 'Test App Title',
                description: 'Test App Description',
                sourceTemplate: {
                    version: '1.2.3-test',
                    id: '@sap/test-ui5-template-id'
                }
            },
            ui5: {
                framework: 'OpenUI5'
            },
            package: {
                name: 'testPackageName'
            }
        });
        expect((fs as any).dump(projectDir)).toMatchSnapshot();
    });

    // Test to ensure the appid does not contain any characters that result in malfored docs
    it('validate appid', async () => {
        const projectDir = join(outputDir, 'testapp2');

        // Ensure double-quote cannot be used
        await expect(
            generate(projectDir, {
                app: {
                    id: 'test"AppId',
                    title: 'Test App Title',
                    description: 'Test App Description'
                },

                package: {
                    name: 'testPackageName'
                }
            })
        ).rejects.toThrowErrorMatchingInlineSnapshot(`"The property: app.id contains disallowed characters: \\""`);

        // Ensure undefined, null or '' cannot be used
        await expect(
            generate(projectDir, {
                app: {
                    id: '',
                    title: 'Test App Title',
                    description: 'Test App Description'
                },

                package: {
                    name: 'testPackageName'
                }
            })
        ).rejects.toThrowErrorMatchingInlineSnapshot(`"The property: app.id must have a value"`);
    });
});
