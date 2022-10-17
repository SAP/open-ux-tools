import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { join } from 'path';
import type { ManifestNamespace } from '@sap-ux/project-access';
import type { ObjectPage } from '../../../src/page';
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
                            name: 'RootEntityListReport',
                            target: 'TestListReport'
                        },
                        {
                            pattern: 'RootEntity({RootEntityKey}):?query:',
                            name: 'RootEntityObjectPage',
                            target: 'RootEntityObjectPage'
                        }
                    ] as ManifestNamespace.Route[],
                    targets: {
                        RootEntityListReport: {},
                        RootEntityObjectPage: {}
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
            entity: 'OtherEntity'
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
                        sourcePage: 'RootEntityListReport',
                        navEntity: minimalInput.entity,
                        navKey: true
                    }
                },
                fs
            );
            expect((fs.readJSON(join(target, 'webapp/manifest.json')) as any)?.['sap.ui5'].routing).toMatchSnapshot();
        });

        test('simple nested navigation', () => {
            const target = join(testDir, 'with-nested-nav');
            fs.write(join(target, 'webapp/manifest.json'), testAppManifest);
            generate(
                target,
                {
                    ...minimalInput,
                    navigation: {
                        sourcePage: 'RootEntityObjectPage',
                        navEntity: `to_${minimalInput.entity}`,
                        navKey: true
                    }
                },
                fs
            );
            expect((fs.readJSON(join(target, 'webapp/manifest.json')) as any)?.['sap.ui5'].routing).toMatchSnapshot();
        });
    });
});
