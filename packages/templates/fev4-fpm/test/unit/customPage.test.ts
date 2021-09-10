import { create as createStorage } from 'mem-fs';
import { create, Editor } from 'mem-fs-editor';
import { join } from 'path';
import { generateCustomPage } from '../../src';

describe('Test generate a custom page', () => {
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

    test('Add new custom page', async () => {
        generateCustomPage(testDir, {
            navigation: {
                sourcePage: "MyObjectPage",
                targetEntity:  "MyNavEntity"
            },
            view: {
                name: "MyCustomView"
            }
        }, fs);
        expect((fs as any).dump(testDir)).toMatchSnapshot();
    });
});
