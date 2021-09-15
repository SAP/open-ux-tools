import { create as createStorage } from 'mem-fs';
import { create, Editor } from 'mem-fs-editor';
import { join } from 'path';
import { generateCustomPage } from '../../src';

describe('CustomPage', () => {
    let fs: Editor;
    const testDir = 'virtual-temp';
    beforeEach(() => {
        // generate required files
        fs = create(createStorage());
        fs.write(join(testDir, 'webapp', 'manifest.json'), JSON.stringify({
            app: {
                id: "my.test.App"
            }
        }));
    });

    test('Add a custom page with minimal input', async () => {
        generateCustomPage(testDir, {
            name: "MyCustomPage",
            entity: "RootEnity"
        }, fs);
        expect((fs as any).dump(testDir)).toMatchSnapshot();
    });
});
