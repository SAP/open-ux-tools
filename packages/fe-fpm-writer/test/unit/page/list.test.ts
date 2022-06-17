import { create as createStorage } from 'mem-fs';
import { create, Editor } from 'mem-fs-editor';
import { join } from 'path';
import { ListReport } from '../../../src/page';
import { generate } from '../../../src/page/list';

describe('ListReport', () => {
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
                    routes: [],
                    targets: {}
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
        const minimalInput: ListReport = {
            entity: 'RootEnity'
        };

        test('minimal input', () => {
            const target = join(testDir, 'minimal-input');
            fs.write(join(target, 'webapp/manifest.json'), testAppManifest);
            generate(target, minimalInput, fs);

            expect(fs.readJSON(join(target, 'webapp/manifest.json'))).toMatchSnapshot();
        });
    });
});
