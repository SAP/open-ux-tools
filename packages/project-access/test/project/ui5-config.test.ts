import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';

import { FileName, getWebappPath, readUi5Yaml } from '../../src';

describe('Test getWebappPath()', () => {
    const samplesRoot = join(__dirname, '..', 'test-data', 'project', 'webapp-path');

    test('Get webapp from default app', async () => {
        expect(await getWebappPath(join(samplesRoot, 'default-webapp-path'))).toEqual(
            join(samplesRoot, 'default-webapp-path', 'webapp')
        );
    });

    test('Get webapp from default app with ui5.yaml that does not contain a custom mapping', async () => {
        expect(await getWebappPath(join(samplesRoot, 'default-with-ui5-yaml'))).toEqual(
            join(samplesRoot, 'default-with-ui5-yaml', 'webapp')
        );
    });

    test('Get webapp from app with custom webapp mapping', async () => {
        expect(await getWebappPath(join(samplesRoot, 'custom-webapp-path'))).toEqual(
            join(samplesRoot, 'custom-webapp-path', 'src', 'webapp')
        );
    });

    test('Get webapp from app with custom webapp mapping in multi document yaml', async () => {
        expect(await getWebappPath(join(samplesRoot, 'custom-webapp-path-multi-yaml'))).toEqual(
            join(samplesRoot, 'custom-webapp-path-multi-yaml', 'src', 'webapp')
        );
    });

    test('Get custom webapp path from mem-fs editor instance', async () => {
        const memFs = create(createStorage());
        memFs.write(
            join(samplesRoot, 'custom-webapp-path/ui5.yaml'),
            'resources:\n  configuration:\n    paths:\n      webapp: new/webapp/path'
        );
        expect(await getWebappPath(join(samplesRoot, 'custom-webapp-path'), memFs)).toEqual(
            join(samplesRoot, 'custom-webapp-path/new/webapp/path')
        );
    });
});

describe('Test readUi5Yaml()', () => {
    const samplesRoot = join(__dirname, '..', 'test-data', 'project', 'webapp-path');

    test('Read existing Ui5 yaml file', async () => {
        expect(await readUi5Yaml(join(samplesRoot, 'custom-webapp-path'), FileName.Ui5Yaml)).toMatchInlineSnapshot(`
            UI5Config {
              "document": YamlDocument {
                "documents": Array [
                  Object {
                    "resources": Object {
                      "configuration": Object {
                        "paths": Object {
                          "webapp": "src/webapp",
                        },
                      },
                    },
                  },
                ],
              },
            }
        `);
    });
    test('Read empty Ui5 yaml file', async () => {
        expect(await readUi5Yaml(join(samplesRoot, 'default-with-ui5-yaml'), FileName.Ui5Yaml)).toMatchInlineSnapshot(`
            UI5Config {
              "document": YamlDocument {
                "documents": Array [
                  null,
                ],
              },
            }
        `);
    });
    test('Read non-existing Ui5 yaml file', async () => {
        try {
            await readUi5Yaml(join(samplesRoot, 'default-webapp-path'), FileName.Ui5Yaml);
            fail('The function should have thrown an error.');
        } catch (error) {
            expect(error).toBeDefined();
        }
    });
    test('Read Ui5 yaml file from memory', async () => {
        const basePath = join(samplesRoot, 'default-webapp-path');

        const memFs = create(createStorage());
        memFs.write(join(basePath, 'myCustomUI5.yaml'), 'chicken-head');
        await readUi5Yaml(basePath, 'myCustomUI5.yaml', memFs);
        expect(memFs.read(join(basePath, 'myCustomUI5.yaml'))).toMatchInlineSnapshot('"chicken-head"');
    });
});
