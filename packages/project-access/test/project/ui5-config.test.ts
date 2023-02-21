import { join } from 'path';
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
});

describe('Test readUi5Yaml()', () => {
    const samplesRoot = join(__dirname, '..', 'test-data', 'project', 'webapp-path');

    test('Read existing Ui5 yaml file', async () => {
        expect(await readUi5Yaml(join(samplesRoot, 'custom-webapp-path'), FileName.Ui5Yaml)).toMatchInlineSnapshot(`
            UI5Config {
              "document": YamlDocument {
                "document": Object {
                  "resources": Object {
                    "configuration": Object {
                      "paths": Object {
                        "webapp": "src/webapp",
                      },
                    },
                  },
                },
              },
            }
        `);
    });
    test('Read empty Ui5 yaml file', async () => {
        expect(await readUi5Yaml(join(samplesRoot, 'default-with-ui5-yaml'), FileName.Ui5Yaml)).toMatchInlineSnapshot(`
            UI5Config {
              "document": YamlDocument {
                "document": null,
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
