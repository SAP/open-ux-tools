import { create as createStorage } from 'mem-fs';
import { create, Editor } from 'mem-fs-editor';
import { join } from 'path';
import { ManifestNamespace } from '@sap-ux/ui5-config';
import { ObjectPage } from '../../../src/page';
import { generate } from '../../../src/page/object';

describe('ObjectPage', () => {
    const testDir = '' + Date.now();
    let fs: Editor;

    const testAppManifest = JSON.stringify(
        {
            'sap.app': {
                id: 'my.test.App'
            },
            'sap.ui5': {
                dependencies: {
                    libs: {
                        'sap.fe.templates': {}
                    }
                },
                routing: {
                    routes: [
                        {
                            pattern: ':?query:',
                            name: 'TestListReport',
                            target: 'TestListReport'
                        }
                    ] as ManifestNamespace.Route[],
                    targets: {
                        TestListReport: {}
                    }
                }
            }
        },
        null,
        2
    );

    beforeEach(() => {
        fs = create(createStorage());
        fs.delete(testDir);
    });

    describe('generate', () => {
        const minimalInput: ObjectPage = {
            entity: 'RootEnity'
        };

        test('minimal input', () => {
            const target = join(testDir, 'minimal-input');
            fs.write(join(target, 'webapp/manifest.json'), testAppManifest);
            generate(target, minimalInput, fs);

            expect(fs.readJSON(join(target, 'webapp/manifest.json'))).toMatchSnapshot();
        });

        test('all optional settings', () => {
            const target = join(testDir, 'all-settings');
            fs.write(join(target, 'webapp/manifest.json'), testAppManifest);
            generate(
                target,
                {
                    ...minimalInput,
                    settings: {
                        enhanceI18n: true,
                        variantManagement: 'Page'
                    }
                },
                fs
            );

            expect(fs.readJSON(join(target, 'webapp/manifest.json'))).toMatchSnapshot();
        });

        test('simple inbound navigation', () => {
            const target = join(testDir, 'with-nav');
            fs.write(join(target, 'webapp/manifest.json'), testAppManifest);
            generate(
                target,
                {
                    ...minimalInput,
                    navigation: {
                        sourcePage: 'TestListReport',
                        sourceEntity: 'RootEntity',
                        navEntity: 'navToChildEntity',
                        navKey: true
                    }
                },
                fs
            );
            expect((fs.readJSON(join(target, 'webapp/manifest.json')) as any)!['sap.ui5'].routing).toMatchSnapshot();
        });
    });
});
