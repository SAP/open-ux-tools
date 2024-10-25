import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { FileName, getAllUi5YamlFileNames, getWebappPath, readUi5Yaml } from '../../src';

describe('Test getAllUi5YamlFileNames()', () => {
    const samplesRoot = join(__dirname, '..', 'test-data', 'project', 'webapp-path');

    test('Read list of only invalid Ui5 yaml files', async () => {
        const memFs = create(createStorage());

        expect(await getAllUi5YamlFileNames(memFs, join(samplesRoot, 'custom-webapp-path'))).toMatchInlineSnapshot(`
            Object {
              "invalid": Array [
                "ui5.yaml",
              ],
              "valid": Array [],
            }
        `);
    });

    test('Read list of only invalid Ui5 yaml files w/o schema validation', async () => {
        const memFs = create(createStorage());

        expect(await getAllUi5YamlFileNames(memFs, join(samplesRoot, 'custom-webapp-path'), false))
            .toMatchInlineSnapshot(`
            Object {
              "valid": Array [
                "ui5.yaml",
              ],
            }
        `);
    });

    test('Read list of Ui5 yaml files, filter out invalid ones', async () => {
        const memFs = create(createStorage());

        expect(await getAllUi5YamlFileNames(memFs, join(samplesRoot, 'default-with-ui5-yaml'))).toMatchInlineSnapshot(`
            Object {
              "invalid": Array [
                "ui5.yaml",
              ],
              "valid": Array [
                "ui5-custom.yaml",
              ],
            }
        `);
    });

    test('Read list of Ui5 yaml files, filter out invalid ones also from mem-fs', async () => {
        const memFs = create(createStorage());
        memFs.write(
            join(samplesRoot, 'default-with-ui5-yaml', 'ui5-something.yaml'),
            'resources:\n  configuration:\n    paths:\n      webapp: src/webapp'
        );

        expect(await getAllUi5YamlFileNames(memFs, join(samplesRoot, 'default-with-ui5-yaml'))).toMatchInlineSnapshot(`
            Object {
              "invalid": Array [
                "ui5.yaml",
                "ui5-something.yaml",
              ],
              "valid": Array [
                "ui5-custom.yaml",
              ],
            }
        `);
    });

    test('Read list of Ui5 yaml files, filter out invalid ones but include from mem-fs', async () => {
        const memFs = create(createStorage());

        const yamlString = `
            specVersion: '4.0'
            metadata:
              name: com.sap.cap.fe.ts.sample
              allowSapInternal: true
            type: application
            framework:
              name: SAPUI5
              version: 1.124.0
            `;

        memFs.write(join(samplesRoot, 'default-with-ui5-yaml', 'ui5-something.yaml'), yamlString);

        expect(await getAllUi5YamlFileNames(memFs, join(samplesRoot, 'default-with-ui5-yaml'))).toMatchInlineSnapshot(`
            Object {
              "invalid": Array [
                "ui5.yaml",
              ],
              "valid": Array [
                "ui5-custom.yaml",
                "ui5-something.yaml",
              ],
            }
        `);
    });
});

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
});
