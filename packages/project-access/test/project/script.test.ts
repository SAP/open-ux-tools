import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { FileName, updatePackageScript } from '../../src';

describe('Test updatePackageScript()', () => {
    const sampleRoot = join(__dirname, '../test-data/json/package');

    test('should add package script', async () => {
        const fs = create(createStorage());
        await updatePackageScript(sampleRoot, 'test', 'run test script', fs);
        expect(fs.dump(join(sampleRoot, FileName.Package))).toMatchInlineSnapshot(`
            Object {
              "": Object {
                "contents": "{
                \\"name\\": \\"test\\",
                \\"version\\": \\"1.0.0\\",
                \\"scripts\\": {
                    \\"test\\": \\"run test script\\"
                }
            }
            ",
                "state": "modified",
              },
            }
        `);
    });
});
