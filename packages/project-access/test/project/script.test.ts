import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { FileName, updatePackageScript, hasUI5CliV3 } from '../../src';

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

    test('hasUI5CliV3', async () => {
        expect(hasUI5CliV3({ '@ui5/cli': '3.0.0' })).toBe(true);
        expect(hasUI5CliV3({})).toBe(false);
        expect(hasUI5CliV3({ '@ui5/cli': '2.0.0' })).toBe(false);
    });
});
